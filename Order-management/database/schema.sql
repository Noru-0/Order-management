-- Order Management Event Store Schema
-- This script creates the necessary tables for the Event Sourcing pattern

-- Create database (run this separately if needed)
-- CREATE DATABASE order_management;

-- Connect to the database
\c order_management;

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Event Store table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_id VARCHAR(255) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL DEFAULT 'Order',
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure version uniqueness per aggregate
    UNIQUE(aggregate_id, version)
);

-- Index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_aggregate_id ON events(aggregate_id);
CREATE INDEX IF NOT EXISTS idx_events_aggregate_type ON events(aggregate_type);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- Snapshots table (optional, for performance optimization)
CREATE TABLE IF NOT EXISTS snapshots (
    aggregate_id VARCHAR(255) PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL DEFAULT 'Order',
    version INTEGER NOT NULL,
    snapshot_data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a view for easy event querying
CREATE OR REPLACE VIEW event_stream AS
SELECT 
    id,
    aggregate_id,
    aggregate_type,
    event_type,
    event_data,
    version,
    timestamp
FROM events
ORDER BY aggregate_id, version;

-- Insert some sample data for testing
INSERT INTO events (aggregate_id, event_type, event_data, version) VALUES
('order-001', 'OrderCreated', '{"customerId": "customer-001", "items": [{"productId": "product-001", "productName": "Laptop Dell XPS", "quantity": 1, "price": 1500}]}', 1),
('order-001', 'OrderStatusUpdated', '{"status": "CONFIRMED"}', 2),
('order-002', 'OrderCreated', '{"customerId": "customer-002", "items": [{"productId": "product-002", "productName": "Mouse Wireless", "quantity": 2, "price": 25}]}', 1);

-- Function to get next version for an aggregate
CREATE OR REPLACE FUNCTION get_next_version(p_aggregate_id VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
    next_version INTEGER;
BEGIN
    SELECT COALESCE(MAX(version), 0) + 1
    INTO next_version
    FROM events
    WHERE aggregate_id = p_aggregate_id;
    
    RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to append event with automatic versioning
CREATE OR REPLACE FUNCTION append_event(
    p_aggregate_id VARCHAR(255),
    p_event_type VARCHAR(100),
    p_event_data JSONB,
    p_expected_version INTEGER DEFAULT NULL
)
RETURNS TABLE(event_id UUID, version INTEGER) AS $$
DECLARE
    v_event_id UUID;
    v_version INTEGER;
    v_current_version INTEGER;
BEGIN
    -- Get current version
    SELECT COALESCE(MAX(events.version), 0)
    INTO v_current_version
    FROM events
    WHERE aggregate_id = p_aggregate_id;
    
    -- Check expected version if provided (for optimistic concurrency)
    IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'Concurrency conflict: expected version %, current version %', 
            p_expected_version, v_current_version;
    END IF;
    
    -- Calculate next version
    v_version := v_current_version + 1;
    
    -- Insert the event
    INSERT INTO events (aggregate_id, event_type, event_data, version)
    VALUES (p_aggregate_id, p_event_type, p_event_data, v_version)
    RETURNING id INTO v_event_id;
    
    RETURN QUERY SELECT v_event_id, v_version;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres;
