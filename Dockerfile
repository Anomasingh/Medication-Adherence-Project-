FROM python:3.13-slim

WORKDIR /app

# Copy requirements
COPY backend/requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/ ./app/

# Copy models
COPY models/ ./app/models/

WORKDIR /app/app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
