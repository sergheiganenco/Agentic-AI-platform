# app/mongo_client.py

from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.MONGO_URI)
db = client["your_database_name"]  # <- Replace with your actual DB name, or make this dynamic if needed

def get_metadata_result(result_id: str):
    """
    Fetches a scan result from MongoDB using its ID (as string).
    """
    # If result_id is stored as ObjectId, convert it:
    # from bson import ObjectId
    # result = db.scan_results.find_one({"_id": ObjectId(result_id)})
    result = db.scan_results.find_one({"_id": result_id})
    if not result:
        return None
    # Optionally, remove MongoDB’s ObjectId from output for FastAPI compatibility:
    result["_id"] = str(result["_id"])
    return result
