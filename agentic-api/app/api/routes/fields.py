from fastapi import APIRouter, Body

router = APIRouter()

@router.post("/validate")
def validate_field(field_name: str = Body(..., embed=True)):
    # Dummy implementation for now
    valid_fields = ["customer_id", "order_id", "amount"]
    exists = field_name in valid_fields
    return {"field_name": field_name, "exists": exists}
