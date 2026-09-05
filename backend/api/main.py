from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import (
    addresses,
    auth,
    cart_items,
    carts,
    categories,
    delivery_providers,
    inventory_locations,
    inventory_movements,
    inventory_stock,
    locations,
    order_history,
    order_items,
    orders,
    payments,
    people,
    product_images,
    product_specs,
    product_variants,
    products,
    shipments,
    stock_reservations,
    variant_specs,
    ingestion,
    rag,
    visual_search,
)
from api.database import Base, engine, SessionLocal
from api.models import Role
from fastapi.staticfiles import StaticFiles
import pathlib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure local storage folder exists and mount static assets
storage_dir = pathlib.Path("storage")
storage_dir.mkdir(exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(people.router)
app.include_router(locations.router)
app.include_router(addresses.router)
app.include_router(ingestion.router)
app.include_router(rag.router)
app.include_router(visual_search.router)
app.include_router(categories.router)
app.include_router(products.router)
app.include_router(product_images.router)
app.include_router(product_variants.router)
app.include_router(product_specs.router)
app.include_router(variant_specs.router)
app.include_router(carts.router)
app.include_router(cart_items.router)
app.include_router(orders.router)
app.include_router(order_items.router)
app.include_router(order_history.router)
app.include_router(delivery_providers.router)
app.include_router(payments.router)
app.include_router(payments.order_router)
app.include_router(shipments.router)
app.include_router(shipments.order_router)
app.include_router(inventory_locations.router)
app.include_router(inventory_stock.router)
app.include_router(inventory_movements.router)
app.include_router(stock_reservations.router)


def seed_default_roles() -> None:
    db = SessionLocal()
    try:
        for role_name in ("User", "Admin", "Staff"):
            existing_role = db.query(Role).filter(Role.role_name == role_name).first()
            if not existing_role:
                db.add(Role(role_name=role_name))
        db.commit()
    finally:
        db.close()


seed_default_roles()

@app.get("/")
def health_check():
    return "Health check complete"