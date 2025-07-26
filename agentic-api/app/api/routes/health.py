from fastapi import APIRouter

router = APIRouter()

@router.get("/", tags=["Health"])
def health_check():
    return {"status": "healthy"}
