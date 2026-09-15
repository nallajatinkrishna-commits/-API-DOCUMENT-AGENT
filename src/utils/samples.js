export const SAMPLES = {
  fastapi: {
    filename: "sample_fastapi.py",
    framework: "fastapi",
    code: `from typing import List, Optional
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

app = FastAPI(title="E-Commerce API", version="1.0.0")

users_router = APIRouter(prefix="/users", tags=["Users"])
products_router = APIRouter(prefix="/products", tags=["Products"])

class UserCreate(BaseModel):
    username: str = Field(..., description="Unique username handle")
    email: str = Field(..., description="User primary email address")
    full_name: Optional[str] = Field(None, description="User full legal name")

class ProductCreate(BaseModel):
    name: str = Field(..., description="Product display title")
    price: float = Field(..., description="Product unit price in USD")
    category: str = Field("general", description="Product category")

def verify_token(authorization: str = None):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")
    return True

@app.get("/health", tags=["System"])
def health_check():
    """Returns server health status and uptime metrics."""
    return {"status": "healthy", "version": "1.0.0"}

@users_router.get("/")
def list_users(
    skip: int = Query(0, description="Pagination offset"),
    limit: int = Query(20, description="Max items per page"),
    active_only: bool = Query(True, description="Filter active users")
):
    """Retrieve paginated list of system users."""
    return [{"id": 1, "username": "alice", "email": "alice@example.com"}]

@users_router.post("/", status_code=201)
def create_user(user: UserCreate, auth: bool = Depends(verify_token)):
    """Register a new user account. Requires Bearer authorization token."""
    return {"id": 2, "username": user.username, "email": user.email}

@users_router.get("/{user_id}")
def get_user_by_id(user_id: int):
    """Fetch user profile by unique ID."""
    return {"id": user_id, "username": "alice", "email": "alice@example.com"}

@products_router.get("/")
def search_products(
    q: Optional[str] = Query(None, description="Search keyword"),
    category: Optional[str] = Query(None, description="Filter by category"),
    max_price: Optional[float] = Query(None, description="Maximum price limit")
):
    """Search product catalog with dynamic filter query parameters."""
    return [{"id": 101, "name": "Wireless Headphones", "price": 149.99}]

@products_router.post("/", status_code=201)
def add_product(product: ProductCreate, auth: bool = Depends(verify_token)):
    """Add a new product listing to the inventory catalog."""
    return {"id": 102, "name": product.name, "price": product.price}

@products_router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, auth: bool = Depends(verify_token)):
    """Delete product entry from catalog by ID."""
    return None

app.include_router(users_router)
app.include_router(products_router)
`
  },
  flask: {
    filename: "sample_flask.py",
    framework: "flask",
    code: `from functools import wraps
from flask import Flask, Blueprint, jsonify, request

app = Flask(__name__)

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not request.headers.get("Authorization"):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")
api_bp = Blueprint("api", __name__, url_prefix="/api/v1")

@app.route("/")
def index():
    """Public API index status check."""
    return jsonify({"status": "Flask API operational"})

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user credentials and issue JWT session token."""
    data = request.get_json() or {}
    return jsonify({"token": "jwt_sample_token", "email": data.get("email")})

@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    """Revoke active user JWT token."""
    return jsonify({"message": "Successfully logged out"})

@api_bp.route("/items", methods=["GET"])
def get_items():
    """Fetch paginated catalog items with optional page filter."""
    page = request.args.get("page", 1, type=int)
    return jsonify({"items": [{"id": 1, "name": "Widget A"}], "page": page})

@api_bp.route("/items/<int:item_id>", methods=["GET"])
def get_item_by_id(item_id):
    """Fetch catalog item details by integer ID."""
    return jsonify({"id": item_id, "name": "Widget A", "price": 29.99})

@api_bp.route("/items", methods=["POST"])
@login_required
def create_item():
    """Create a new catalog item. Requires authentication."""
    data = request.get_json() or {}
    return jsonify({"id": 42, "name": data.get("name", "New Item")}), 201

@api_bp.route("/items/<int:item_id>", methods=["PUT", "PATCH"])
@login_required
def update_item(item_id):
    """Update existing item attributes by ID."""
    return jsonify({"id": item_id, "status": "updated"})

@api_bp.route("/items/<int:item_id>", methods=["DELETE"])
@login_required
def delete_item(item_id):
    """Delete item record by integer ID."""
    return jsonify({"success": True}), 200

app.register_blueprint(auth_bp)
app.register_blueprint(api_bp)
`
  },
  express: {
    filename: "sample_express.js",
    framework: "express",
    code: `const express = require('express');
const app = express();
const router = express.Router();

app.use(express.json());

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

/**
 * Health check status endpoint for system monitoring.
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * Get paginated task items.
 */
router.get('/tasks', (req, res) => {
  res.json([{ id: 't-101', title: 'Complete Documentation Agent', status: 'in_progress' }]);
});

/**
 * Create a new task item.
 * Requires authMiddleware token.
 */
router.post('/tasks', authMiddleware, (req, res) => {
  const { title, description } = req.body;
  res.status(201).json({ id: 't-102', title, description });
});

/**
 * Fetch detailed task info by unique string ID.
 */
router.get('/tasks/:id', (req, res) => {
  res.json({ id: req.params.id, title: 'Sample Task', status: 'active' });
});

/**
 * Update task attributes or status by ID.
 * Requires authMiddleware token.
 */
router.put('/tasks/:id', authMiddleware, (req, res) => {
  res.json({ id: req.params.id, updated: true });
});

/**
 * Delete task entry from database by ID.
 * Requires authMiddleware token.
 */
router.delete('/tasks/:id', authMiddleware, (req, res) => {
  res.json({ success: true, message: \`Task \${req.params.id} deleted\` });
});

app.use('/api/v1', router);

app.listen(3000, () => console.log('Express app listening on 3000'));
`
  }
};
