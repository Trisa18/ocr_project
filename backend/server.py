from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import json
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# AI Budget Allocation Logic
class BudgetCalculator:
    ROLE_MULTIPLIERS = {
        "intern": {"domestic": 1500, "international": 3000},
        "junior": {"domestic": 2500, "international": 5000},
        "senior": {"domestic": 3500, "international": 7000},
        "manager": {"domestic": 4000, "international": 8000},
        "director": {"domestic": 5000, "international": 10000},
        "executive": {"domestic": 6000, "international": 12000}
    }
    
    @classmethod
    async def calculate_budget(cls, role: str, destination: str, duration: int, purpose: str):
        role_lower = role.lower()
        dest_type = "international" if destination.lower() not in ["india", "domestic"] else "domestic"
        
        base_daily = cls.ROLE_MULTIPLIERS.get(role_lower, cls.ROLE_MULTIPLIERS["junior"])[dest_type]
        
        # AI Enhancement using Gemini
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"budget-calc-{uuid.uuid4()}",
                system_message="You are an AI budget allocation expert for corporate travel. Provide realistic budget recommendations."
            ).with_model("gemini", "gemini-2.0-flash")
            
            prompt = f"""
            Calculate travel budget for:
            - Role: {role}
            - Destination: {destination}
            - Duration: {duration} days
            - Purpose: {purpose}
            - Base daily allowance: ₹{base_daily}
            
            Provide breakdown for:
            1. Travel (flights/transport)
            2. Accommodation per night
            3. Food per day
            4. Local transport per day
            5. Miscellaneous per day
            
            Return only a JSON object with keys: travel, accommodation_per_night, food_per_day, local_transport_per_day, miscellaneous_per_day, total_budget
            """
            
            response = await chat.send_message(UserMessage(text=prompt))
            
            # Try to parse AI response
            try:
                budget_data = json.loads(response.strip())
                return budget_data
            except:
                # Fallback calculation
                travel = base_daily * 2 if dest_type == "international" else base_daily * 0.5
                accommodation = base_daily * 0.6
                food = base_daily * 0.3
                local_transport = base_daily * 0.1
                miscellaneous = base_daily * 0.2
                
                return {
                    "travel": int(travel),
                    "accommodation_per_night": int(accommodation),
                    "food_per_day": int(food),
                    "local_transport_per_day": int(local_transport),
                    "miscellaneous_per_day": int(miscellaneous),
                    "total_budget": int(travel + (accommodation + food + local_transport + miscellaneous) * duration)
                }
        except Exception as e:
            # Fallback calculation
            travel = base_daily * 2 if dest_type == "international" else base_daily * 0.5
            accommodation = base_daily * 0.6
            food = base_daily * 0.3
            local_transport = base_daily * 0.1
            miscellaneous = base_daily * 0.2
            
            return {
                "travel": int(travel),
                "accommodation_per_night": int(accommodation),
                "food_per_day": int(food),
                "local_transport_per_day": int(local_transport),
                "miscellaneous_per_day": int(miscellaneous),
                "total_budget": int(travel + (accommodation + food + local_transport + miscellaneous) * duration)
            }

# OCR Processing
class OCRProcessor:
    @staticmethod
    async def process_receipt(file_content: bytes, filename: str):
        try:
            api_key = os.environ.get('EMERGENT_LLM_KEY')
            chat = LlmChat(
                api_key=api_key,
                session_id=f"ocr-{uuid.uuid4()}",
                system_message="You are an OCR expert that extracts structured data from receipts and bills."
            ).with_model("gemini", "gemini-2.0-flash")
            
            # Convert to base64
            base64_image = base64.b64encode(file_content).decode()
            
            # Create temporary file for Gemini
            temp_path = f"/tmp/{filename}"
            with open(temp_path, "wb") as f:
                f.write(file_content)
            
            image_file = FileContentWithMimeType(
                file_path=temp_path,
                mime_type="image/jpeg" if filename.lower().endswith(('.jpg', '.jpeg')) else "image/png"
            )
            
            prompt = """
            Extract the following information from this receipt/bill:
            1. Vendor/Business name
            2. Date (format: YYYY-MM-DD)
            3. Total amount (numeric value only)
            4. Category (Food, Transport, Accommodation, Miscellaneous)
            5. Items purchased (if available)
            
            Return only a JSON object with keys: vendor, date, amount, category, items
            """
            
            message = UserMessage(
                text=prompt,
                file_contents=[image_file]
            )
            
            response = await chat.send_message(message)
            
            # Clean up temp file
            os.remove(temp_path)
            
            # Parse response
            try:
                ocr_data = json.loads(response.strip())
                return ocr_data
            except:
                return {
                    "vendor": "Unknown",
                    "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                    "amount": 0,
                    "category": "Miscellaneous",
                    "items": []
                }
        except Exception as e:
            print(f"OCR processing error: {e}")
            return {
                "vendor": "Unknown",
                "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "amount": 0,
                "category": "Miscellaneous",
                "items": []
            }

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str  # intern, junior, senior, manager, director, executive
    is_manager: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    name: str
    role: str
    is_manager: bool = False

class TripRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    destination: str
    duration: int  # days
    purpose: str
    start_date: str
    end_date: str
    ai_budget: Optional[dict] = None
    manager_approved_budget: Optional[dict] = None
    status: str = "pending"  # pending, approved, rejected, in_progress, completed
    manager_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TripRequestCreate(BaseModel):
    destination: str
    duration: int
    purpose: str
    start_date: str
    end_date: str

class BudgetApproval(BaseModel):
    approved_budget: dict
    notes: Optional[str] = None

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trip_id: str
    employee_id: str
    vendor: str
    amount: float
    category: str  # Food, Transport, Accommodation, Miscellaneous
    date: str
    receipt_filename: Optional[str] = None
    items: Optional[List[str]] = None
    status: str = "pending"  # pending, approved, rejected
    manager_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ExpenseCreate(BaseModel):
    trip_id: str
    vendor: str
    amount: float
    category: str
    date: str
    items: Optional[List[str]] = None

class ExpenseApproval(BaseModel):
    status: str  # approved, rejected
    notes: Optional[str] = None

# Helper function to get current user (mock for MVP)
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # For MVP, we'll use a simple token system
    # In production, implement proper JWT validation
    token = credentials.credentials
    # Mock user based on token
    if token == "employee":
        return {"id": "emp1", "email": "employee@company.com", "name": "John Employee", "role": "senior", "is_manager": False}
    elif token == "manager":
        return {"id": "mgr1", "email": "manager@company.com", "name": "Jane Manager", "role": "manager", "is_manager": True}
    else:
        raise HTTPException(status_code=401, detail="Invalid token")

# User Management
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user_dict = user_data.dict()
    user_obj = User(**user_dict)
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users/me")
async def get_current_user_info(current_user = Depends(get_current_user)):
    return current_user

# Trip Management
@api_router.post("/trips", response_model=TripRequest)
async def create_trip_request(trip_data: TripRequestCreate, current_user = Depends(get_current_user)):
    # Calculate AI budget
    ai_budget = await BudgetCalculator.calculate_budget(
        role=current_user["role"],
        destination=trip_data.destination,
        duration=trip_data.duration,
        purpose=trip_data.purpose
    )
    
    trip_dict = trip_data.dict()
    trip_dict["employee_id"] = current_user["id"]
    trip_dict["ai_budget"] = ai_budget
    trip_obj = TripRequest(**trip_dict)
    
    await db.trips.insert_one(trip_obj.dict())
    return trip_obj

@api_router.get("/trips", response_model=List[TripRequest])
async def get_trips(current_user = Depends(get_current_user)):
    if current_user["is_manager"]:
        # Managers see all trips
        trips = await db.trips.find().to_list(1000)
    else:
        # Employees see only their trips
        trips = await db.trips.find({"employee_id": current_user["id"]}).to_list(1000)
    
    return [TripRequest(**trip) for trip in trips]

@api_router.get("/trips/{trip_id}", response_model=TripRequest)
async def get_trip(trip_id: str, current_user = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Check permissions
    if not current_user["is_manager"] and trip["employee_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return TripRequest(**trip)

@api_router.put("/trips/{trip_id}/approve")
async def approve_trip_budget(trip_id: str, approval: BudgetApproval, current_user = Depends(get_current_user)):
    if not current_user["is_manager"]:
        raise HTTPException(status_code=403, detail="Only managers can approve budgets")
    
    update_data = {
        "manager_approved_budget": approval.approved_budget,
        "status": "approved",
        "manager_notes": approval.notes
    }
    
    result = await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return {"message": "Trip budget approved"}

@api_router.put("/trips/{trip_id}/reject")
async def reject_trip_budget(trip_id: str, approval: BudgetApproval, current_user = Depends(get_current_user)):
    if not current_user["is_manager"]:
        raise HTTPException(status_code=403, detail="Only managers can reject budgets")
    
    update_data = {
        "status": "rejected",
        "manager_notes": approval.notes
    }
    
    result = await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    return {"message": "Trip budget rejected"}

@api_router.put("/trips/{trip_id}/start")
async def start_trip(trip_id: str, current_user = Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if trip["employee_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if trip["status"] != "approved":
        raise HTTPException(status_code=400, detail="Trip must be approved first")
    
    result = await db.trips.update_one({"id": trip_id}, {"$set": {"status": "in_progress"}})
    return {"message": "Trip started"}

# Expense Management
@api_router.post("/expenses")
async def create_expense_manual(expense_data: ExpenseCreate, current_user = Depends(get_current_user)):
    expense_dict = expense_data.dict()
    expense_dict["employee_id"] = current_user["id"]
    expense_obj = Expense(**expense_dict)
    
    await db.expenses.insert_one(expense_obj.dict())
    return expense_obj

@api_router.post("/expenses/upload")
async def create_expense_with_receipt(
    trip_id: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Read file content
    file_content = await file.read()
    
    # Process with OCR
    ocr_data = await OCRProcessor.process_receipt(file_content, file.filename)
    
    # Create expense from OCR data
    expense_dict = {
        "trip_id": trip_id,
        "employee_id": current_user["id"],
        "vendor": ocr_data.get("vendor", "Unknown"),
        "amount": float(ocr_data.get("amount") or 0),
        "category": ocr_data.get("category", "Miscellaneous"),
        "date": ocr_data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "receipt_filename": file.filename,
        "items": ocr_data.get("items", [])
    }
    
    expense_obj = Expense(**expense_dict)
    await db.expenses.insert_one(expense_obj.dict())
    
    return {"expense": expense_obj, "ocr_data": ocr_data}

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(trip_id: Optional[str] = None, current_user = Depends(get_current_user)):
    query = {}
    
    if trip_id:
        query["trip_id"] = trip_id
    
    if not current_user["is_manager"]:
        query["employee_id"] = current_user["id"]
    
    expenses = await db.expenses.find(query).to_list(1000)
    return [Expense(**expense) for expense in expenses]

@api_router.put("/expenses/{expense_id}/approve")
async def approve_expense(expense_id: str, approval: ExpenseApproval, current_user = Depends(get_current_user)):
    if not current_user["is_manager"]:
        raise HTTPException(status_code=403, detail="Only managers can approve expenses")
    
    update_data = {
        "status": approval.status,
        "manager_notes": approval.notes
    }
    
    result = await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    return {"message": f"Expense {approval.status}"}

# Analytics
@api_router.get("/analytics/dashboard")
async def get_dashboard_analytics(current_user = Depends(get_current_user)):
    if current_user["is_manager"]:
        # Manager dashboard
        total_trips = await db.trips.count_documents({})
        pending_trips = await db.trips.count_documents({"status": "pending"})
        active_trips = await db.trips.count_documents({"status": "in_progress"})
        
        total_expenses = await db.expenses.count_documents({})
        pending_expenses = await db.expenses.count_documents({"status": "pending"})
        
        # Calculate total spend
        pipeline = [
            {"$match": {"status": "approved"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        total_spend_result = await db.expenses.aggregate(pipeline).to_list(1)
        total_spend = total_spend_result[0]["total"] if total_spend_result else 0
        
        return {
            "role": "manager",
            "total_trips": total_trips,
            "pending_trips": pending_trips,
            "active_trips": active_trips,
            "total_expenses": total_expenses,
            "pending_expenses": pending_expenses,
            "total_spend": total_spend
        }
    else:
        # Employee dashboard
        my_trips = await db.trips.count_documents({"employee_id": current_user["id"]})
        my_active_trips = await db.trips.count_documents({"employee_id": current_user["id"], "status": "in_progress"})
        my_expenses = await db.expenses.count_documents({"employee_id": current_user["id"]})
        
        # My total spend
        pipeline = [
            {"$match": {"employee_id": current_user["id"], "status": "approved"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        my_spend_result = await db.expenses.aggregate(pipeline).to_list(1)
        my_spend = my_spend_result[0]["total"] if my_spend_result else 0
        
        return {
            "role": "employee",
            "my_trips": my_trips,
            "my_active_trips": my_active_trips,
            "my_expenses": my_expenses,
            "my_spend": my_spend
        }

# Test endpoints
@api_router.get("/")
async def root():
    return {"message": "AI Trip Management System API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()