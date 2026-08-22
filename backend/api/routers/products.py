from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4
import pathlib

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from pydantic import BaseModel, ConfigDict

from api.deps import db_dependency, get_current_user, require_admin_or_staff, supabase_dependency
from api.models import Product, Category, product_category

router = APIRouter(prefix="/products", tags=["products"])


# ── Schemas ──────────────────────────────────────────────────────────────────


class ImageUploadResponse(BaseModel):
    image_url: str
    file_name: str


class CategoryBrief(BaseModel):
    category_id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class VariantBrief(BaseModel):
    variant_id: UUID
    model: Optional[str] = None
    color: Optional[str] = None
    storage: Optional[str] = None
    price: Decimal
    status: str
    image_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class SpecBrief(BaseModel):
    spec_product_id: UUID
    spec_name: str
    spec_value: str
    model_config = ConfigDict(from_attributes=True)


class ProductRead(BaseModel):
    product_id: UUID
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    categories: list[CategoryBrief] = []
    variants: list[VariantBrief] = []
    specs: list[SpecBrief] = []
    model_config = ConfigDict(from_attributes=True)


class ProductListItem(BaseModel):
    product_id: UUID
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    categories: list[CategoryBrief] = []
    variant_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    category_ids: list[UUID] = []


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    category_ids: Optional[list[UUID]] = None


# ── Helpers ──────────────────────────────────────────────────────────────────


def product_to_list_item(product: Product) -> ProductListItem:
    return ProductListItem(
        product_id=product.product_id,
        name=product.name,
        description=product.description,
        image_url=product.image_url,
        categories=[CategoryBrief.model_validate(c) for c in product.categories],
        variant_count=len(product.variants),
    )


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[ProductListItem])
def list_products(
    db: db_dependency,
    _: dict = Depends(get_current_user),
    category_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
):
    query = db.query(Product)

    if category_id is not None:
        query = query.join(Product.categories).filter(
            Category.category_id == category_id
        )

    if search is not None:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    products = query.order_by(Product.name.asc()).all()
    return [product_to_list_item(p) for p in products]


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: UUID,
    db: db_dependency,
    _: dict = Depends(get_current_user),
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return ProductRead.model_validate(product)


@router.post("/upload-image", response_model=ImageUploadResponse)
async def upload_product_image(
    supabase_client: supabase_dependency,
    file: UploadFile = File(...),
    _: dict = Depends(require_admin_or_staff),
):
    """
    Direct image upload endpoint (Admin/Staff only).
    Saves to storage and uploads to Supabase Storage, returning the public image URL.
    """
    if file.content_type and not file.content_type.startswith("image/"):
        ext = pathlib.Path(file.filename or "").suffix.lower()
        if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file must be a valid image (JPG, PNG, WEBP, GIF, SVG)",
            )

    storage_dir = pathlib.Path("storage/products")
    storage_dir.mkdir(parents=True, exist_ok=True)

    safe_original_name = pathlib.Path(file.filename or "image.png").name
    safe_filename = f"{uuid4().hex[:12]}_{safe_original_name}"
    local_path = storage_dir / safe_filename

    try:
        contents = await file.read()
        with open(local_path, "wb") as f:
            f.write(contents)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save image locally: {exc}",
        )

    image_url = None
    try:
        bucket_name = "electron-gate"
        upload_path = f"products/{safe_filename}"
        supabase_client.storage.from_(bucket_name).upload(
            upload_path,
            contents,
            {"content-type": file.content_type or "image/png"},
        )
        image_url = supabase_client.storage.from_(bucket_name).get_public_url(upload_path)
    except Exception:
        # Fall back cleanly if Supabase bucket is unconfigured
        pass

    if not image_url:
        image_url = f"/storage/products/{safe_filename}"

    return ImageUploadResponse(image_url=image_url, file_name=safe_original_name)


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    body: ProductCreate,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    product = Product(
        name=body.name,
        description=body.description,
        image_url=body.image_url,
    )

    if body.category_ids:
        categories_list = (
            db.query(Category)
            .filter(Category.category_id.in_(body.category_ids))
            .all()
        )
        if len(categories_list) != len(body.category_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more categories not found",
            )
        product.categories = categories_list

    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductRead.model_validate(product)


@router.put("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: UUID,
    body: ProductUpdate,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    if body.name is not None:
        product.name = body.name
    if body.description is not None:
        product.description = body.description
    if body.image_url is not None:
        product.image_url = body.image_url

    if body.category_ids is not None:
        categories_list = (
            db.query(Category)
            .filter(Category.category_id.in_(body.category_ids))
            .all()
        )
        if len(categories_list) != len(body.category_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more categories not found",
            )
        product.categories = categories_list

    db.commit()
    db.refresh(product)
    return ProductRead.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    db: db_dependency,
    _: dict = Depends(require_admin_or_staff),
):
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    db.delete(product)
    db.commit()
