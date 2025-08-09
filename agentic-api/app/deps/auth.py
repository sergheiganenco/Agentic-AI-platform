from fastapi import Depends, HTTPException, status
from pydantic import BaseModel

class CurrentUser(BaseModel):
    user_id: str
    org_id: str  # tenant id
    roles: list[str] = []

# TODO: replace with your real JWT/session logic
def get_current_user() -> CurrentUser:
    # decode token, fetch user/org/roles, etc.
    # raise if invalid
    return CurrentUser(user_id="demo", org_id="demo-tenant", roles=["steward"])
