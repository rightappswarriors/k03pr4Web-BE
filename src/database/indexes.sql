-- Run these in PostgreSQL after reviewing table/column names in the target DB.
-- They are intentionally not executed by the app so local setup stays safe.

CREATE INDEX IF NOT EXISTS idx_api_user_email_lower ON api_user (lower(email));
CREATE INDEX IF NOT EXISTS idx_kompra_customer_email_lower ON "KompraCustomer" (lower(email));

CREATE INDEX IF NOT EXISTS idx_api_cart_user_id ON api_cart (user_id);
CREATE INDEX IF NOT EXISTS idx_api_cartitem_cart_id ON api_cartitem (cart_id);
CREATE INDEX IF NOT EXISTS idx_api_cartitem_product_branch ON api_cartitem (product_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_item_id ON "InventoryItems" ("itemId");
CREATE INDEX IF NOT EXISTS idx_inventory_items_inventory_id ON "InventoryItems" ("inventoryId");
CREATE INDEX IF NOT EXISTS idx_inventory_items_available ON "InventoryItems" (id, quantity) WHERE quantity > 0;

CREATE INDEX IF NOT EXISTS idx_item_category_id ON "Item" ("categoryId");
CREATE INDEX IF NOT EXISTS idx_item_org_category_id ON "Item" ("orgCategoryId");
CREATE INDEX IF NOT EXISTS idx_outlet_org_branch ON "Outlet" ("orgId", "branchId");
CREATE INDEX IF NOT EXISTS idx_branch_org_active ON "Branch" ("orgId", "isActive");

CREATE INDEX IF NOT EXISTS idx_order_customer_created ON "KompraCOrder" ("customerId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_order_item_order_id ON "KompraCOrderItem" ("orderId");
CREATE INDEX IF NOT EXISTS idx_notification_org_read_created ON "Notification" ("orgId", "isRead", "createdAt" DESC);
