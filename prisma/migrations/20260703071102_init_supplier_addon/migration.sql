-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('SELLER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'GOLD');

-- CreateEnum
CREATE TYPE "OrderMode" AS ENUM ('WALK_IN', 'PICK_UP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'in_delivery', 'received', 'cancelled', 'returned', 'packed');

-- CreateEnum
CREATE TYPE "Access" AS ENUM ('SELLER', 'SUPPLIER', 'POSTERMINAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('ASSIGN_TO_OUTLET', 'SALE', 'RESTOCK_TO_OUTLET', 'PURCHASE_RECEIVED', 'CUSTOMER_RETURN', 'WRITE_OFF', 'ADJUSTMENT', 'SUPPLIER_DELIVERY');

-- CreateEnum
CREATE TYPE "SupplierOrderStatus" AS ENUM ('pending', 'acknowledged', 'sent', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('once', 'daily', 'weekly', 'monthly', 'custom');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('OUTLET_LOW_STOCK', 'ORG_CRITICAL_STOCK', 'NEW_TRANSACTION');

-- CreateEnum
CREATE TYPE "VatExemptType" AS ENUM ('SENIOR_CITIZEN', 'PWD', 'DIPLOMAT', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ON_BREAK', 'OFF_DUTY', 'ABSENT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'EDIT', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE', 'STATUS_CHANGE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('Active', 'On_Leave', 'Contract');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'STAFF', 'CASHIER', 'OWNER');

-- CreateEnum
CREATE TYPE "OutletType" AS ENUM ('retail', 'wholesale', 'service');

-- CreateEnum
CREATE TYPE "OutletStatus" AS ENUM ('open', 'closed', 'maintenance');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'CASH', 'E_WALLET');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('NONE', 'SENIOR_CITIZEN', 'PWD', 'BNPC_SENIOR_CITIZEN', 'BNPC_PWD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('REGULAR', 'SENIOR_CITIZEN', 'PWD');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'COMPLETED', 'PAID', 'SYNCED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('gcash', 'paymaya', 'card', 'qrph');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "DeliveryStatusEvent" AS ENUM ('order_placed', 'outlet_confirmed', 'outlet_preparing', 'rider_assigned', 'rider_picked_up', 'rider_en_route', 'arrived_at_door', 'delivered', 'cancelled', 'return_requested', 'returned');

-- CreateEnum
CREATE TYPE "FeeType" AS ENUM ('delivery', 'packaging', 'priority', 'handling', 'voucher_discount');

-- CreateEnum
CREATE TYPE "KompraCPaymentMethod" AS ENUM ('cash_on_delivery', 'gcash', 'paymaya', 'card', 'qrph');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "Environment" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('BUSINESS_PERMIT', 'DTI_SEC_REGISTRATION', 'BIR_2303', 'VALID_ID', 'PROOF_OF_ADDRESS', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BYPASSED_DEV');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('ORG_LINKED', 'STANDALONE');

-- CreateEnum
CREATE TYPE "MandateStatus" AS ENUM ('DRAFT', 'SEARCHING', 'SENT', 'OFFERED', 'ACCEPTED', 'FUNDED', 'SETTLED', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MandateOfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerSourceType" AS ENUM ('RETAIL_ORDER', 'MANDATE_TRANSACTION', 'WITHDRAWAL', 'SUBSCRIPTION_FEE', 'PLATFORM_FEE', 'ADJUSTMENT', 'ESCROW_HOLD', 'ESCROW_RELEASE');

-- CreateEnum
CREATE TYPE "LedgerEntryStatus" AS ENUM ('HELD', 'AVAILABLE', 'RELEASED', 'REVERSED');

-- CreateEnum
CREATE TYPE "PayoutMethodType" AS ENUM ('BANK_TRANSFER', 'GCASH', 'PAYMAYA', 'CHECK');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('PAYMONGO', 'GCASH', 'PAYMAYA', 'BANK_API');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentRelatedType" AS ENUM ('KOMPRA_C_ORDER', 'SALES_ORDER', 'MANDATE_TRANSACTION', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('INSTANT', 'ESCROW');

-- CreateEnum
CREATE TYPE "MandateTransactionStatus" AS ENUM ('PENDING', 'FUNDED', 'SETTLED', 'COMPLETED', 'DISPUTED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'RAISED', 'UNDER_REVIEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "FeeApplication" AS ENUM ('MANDATE_TRANSACTION', 'RETAIL_ORDER');

-- CreateEnum
CREATE TYPE "FeeRateType" AS ENUM ('PERCENTAGE', 'PER_UNIT', 'FLAT');

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "roles" "OrgRole"[] DEFAULT ARRAY['SELLER']::"OrgRole"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "bannerImg" TEXT,
    "profileImg" TEXT,
    "contactNumber" TEXT,
    "email" TEXT,
    "location" TEXT,
    "profilePhoto" TEXT,
    "facebookLink" TEXT,
    "instagramLink" TEXT,
    "twitterLink" TEXT,
    "bio" TEXT,
    "isDevSeed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "expiresAt" TIMESTAMP(3),
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profilePhoto" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "managerId" INTEGER,
    "enabledPaymentMethod" BOOLEAN NOT NULL DEFAULT false,
    "contactNumber" TEXT,
    "orgId" INTEGER,
    "salary" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationCode" TEXT,
    "country" TEXT,
    "zipCode" TEXT,
    "city" TEXT,
    "address" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "positionId" TEXT,
    "departmentId" INTEGER,
    "updatedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymongoAPIKeys" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "public_key" TEXT NOT NULL,
    "secret_key" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,

    CONSTRAINT "PaymongoAPIKeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "orgId" INTEGER NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "locationId" INTEGER,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceLocation" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "branchId" INTEGER NOT NULL,

    CONSTRAINT "PlaceLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outlet" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "code" TEXT NOT NULL,
    "nextTransactionNumber" INTEGER DEFAULT 1,
    "governmentTax" DOUBLE PRECISION,
    "serviceCharge" DOUBLE PRECISION,
    "outletType" "OutletType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "wifiSSID" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "orgId" INTEGER NOT NULL,
    "branchId" INTEGER,
    "ownerId" INTEGER NOT NULL,
    "apiKeyId" INTEGER,
    "hasKey" BOOLEAN NOT NULL DEFAULT false,
    "status" "OutletStatus" NOT NULL DEFAULT 'open',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "bannerImage" TEXT,
    "bir" TEXT,
    "isVatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "ptu" TEXT,
    "tin" TEXT,
    "vatTypeId" INTEGER,
    "vatZeroSale" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "Outlet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "PromoType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletPromo" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "promoTypeId" INTEGER NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "vatable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OutletPromo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletStaff" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" "Role" NOT NULL,
    "isPresent" BOOLEAN NOT NULL DEFAULT false,
    "logInTime" TIMESTAMP(3),

    CONSTRAINT "OutletStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnauthorizedAttempt" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "attemptedDeviceId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnauthorizedAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT,
    "outletId" INTEGER NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "aisle" TEXT,
    "rack" TEXT,
    "shelf" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER,
    "outletId" INTEGER,
    "type" "StockMovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "quantityBefore" DOUBLE PRECISION NOT NULL,
    "quantityAfter" DOUBLE PRECISION NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItems" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "inventoryId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "locationId" INTEGER,
    "categoryId" INTEGER,
    "baseUnit" TEXT NOT NULL DEFAULT 'piece',

    CONSTRAINT "InventoryItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "groupType" TEXT,
    "sales" TEXT,
    "stocks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "icon" TEXT,

    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgItemCategory" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "cost_of_sale" TEXT,
    "groupType" TEXT,
    "sales" TEXT,
    "stocks" TEXT,
    "groupId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "OrgItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "ItemGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCategoryMap" (
    "itemId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "ItemCategoryMap_pkey" PRIMARY KEY ("itemId","categoryId")
);

-- CreateTable
CREATE TABLE "VatType" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "VatType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "barcode" TEXT NOT NULL,
    "brand" TEXT,
    "orgId" INTEGER NOT NULL,
    "categoryId" INTEGER,
    "brandId" INTEGER,
    "ServiceCharge" BOOLEAN NOT NULL DEFAULT false,
    "assembly" BOOLEAN NOT NULL DEFAULT false,
    "itemCode" TEXT,
    "skuNumber" TEXT,
    "vatExempt" BOOLEAN,
    "isVatExempt" BOOLEAN NOT NULL DEFAULT false,
    "isBNPC" BOOLEAN NOT NULL DEFAULT false,
    "hasSeniorDiscountVATExempt" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opExPct" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "priceB" DOUBLE PRECISION,
    "priceC" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiryEndDate" TIMESTAMP(3),
    "expiryStartDate" TIMESTAMP(3),
    "exactExpiryDate" TIMESTAMP(3),
    "orgCategoryId" INTEGER,
    "vatTypeId" INTEGER,
    "stockDescription" TEXT,
    "stockLabel" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCostHistory" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "costLines" JSONB NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" INTEGER,
    "reason" TEXT,

    CONSTRAINT "ItemCostHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPriceHistory" (
    "id" SERIAL NOT NULL,
    "itemId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" INTEGER,
    "reason" TEXT,
    "supplierItemId" TEXT,

    CONSTRAINT "ItemPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "orderMode" "OrderMode" NOT NULL DEFAULT 'WALK_IN',
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'PENDING',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inventoryDeductedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER,
    "outletId" INTEGER,
    "branchId" INTEGER,
    "customerName" TEXT,
    "customerContact" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'REGULAR',
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "vatExemptSale" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPax" INTEGER,
    "scPwdPax" INTEGER,
    "scPwdCustomerId" TEXT,
    "deliveryAddress" TEXT,
    "deliveryNotes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraChargesTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outletPromoId" INTEGER,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraCharge" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ExtraCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderItem" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "salesOrderId" TEXT NOT NULL,
    "itemId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "discountQuantity" DOUBLE PRECISION DEFAULT 0,
    "discountRate" DOUBLE PRECISION DEFAULT 0,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "unitId" INTEGER,
    "unitName" TEXT,
    "costSnapshot" DOUBLE PRECISION,
    "priceSnapshot" DOUBLE PRECISION,
    "isCustomItem" BOOLEAN NOT NULL DEFAULT false,
    "customItemName" TEXT,
    "vatExempt" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SalesOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderDelivery" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "salesOrderId" TEXT NOT NULL,
    "courierName" TEXT,
    "trackingNumber" TEXT,
    "address" TEXT NOT NULL,
    "contactPerson" TEXT,
    "contactNumber" TEXT,
    "notes" TEXT,
    "estimatedDate" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "SalesOrderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemUnit" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "unitName" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItemUnit" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "inventoryItemId" INTEGER NOT NULL,
    "unitName" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "baseUnit" TEXT NOT NULL DEFAULT 'piece',
    "barcode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minOrderQty" DOUBLE PRECISION,
    "maxOrderQty" DOUBLE PRECISION,
    "reorderPoint" DOUBLE PRECISION,
    "allowDecimal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "InventoryItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDetails" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "fullname" TEXT,
    "username" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,
    "paymentType" "PaymentType" NOT NULL,
    "paymentMethodId" TEXT,
    "paymentIntentId" TEXT,
    "client_key" TEXT,
    "status" TEXT,
    "transactionId" INTEGER NOT NULL,

    CONSTRAINT "CustomerDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KompraCOrder" (
    "id" SERIAL NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "deliveryAddressId" INTEGER NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "scheduledDeliveryAt" TIMESTAMP(3),
    "estimatedDeliveryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "paymentMethod" "KompraCPaymentMethod" NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'unpaid',
    "paymentReference" TEXT,
    "riderName" TEXT,
    "riderPhone" TEXT,
    "customerNote" TEXT,
    "outletNote" TEXT,
    "cancelNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "packedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "placedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "inventoryDeductedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "courierId" INTEGER,
    "scPwdCustomerId" TEXT,
    "customerType" "CustomerType" DEFAULT 'REGULAR',
    "discountType" "DiscountType" DEFAULT 'NONE',
    "scPwdPax" INTEGER,
    "totalPax" INTEGER,
    "vatExemptSale" DOUBLE PRECISION DEFAULT 0,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "vatAmount" DOUBLE PRECISION DEFAULT 0,
    "grandTotal" DOUBLE PRECISION,
    "checkoutGroupId" TEXT,

    CONSTRAINT "KompraCOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KompraCOrderItem" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "orderId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "priceSnapshot" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "unitId" INTEGER,
    "costSnapshot" DOUBLE PRECISION,

    CONSTRAINT "KompraCOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KompraCOrderFee" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "orderId" INTEGER NOT NULL,
    "type" "FeeType" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "KompraCOrderFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KompraCDeliveryTracking" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "orderId" INTEGER NOT NULL,
    "event" "DeliveryStatusEvent" NOT NULL,
    "statusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "note" TEXT,
    "actorType" TEXT NOT NULL,
    "actorId" INTEGER,

    CONSTRAINT "KompraCDeliveryTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletDeliveryConfig" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "outletId" INTEGER NOT NULL,
    "isDeliveryActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "baseDeliveryFee" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "feePerKm" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "minOrderAmount" DOUBLE PRECISION,
    "maxOrderAmount" DOUBLE PRECISION,
    "avgPrepMins" INTEGER NOT NULL DEFAULT 15,

    CONSTRAINT "OutletDeliveryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutletItemSearchIndex" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "outletLatitude" DOUBLE PRECISION NOT NULL,
    "outletLongitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OutletItemSearchIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KompraCustomer" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "phone" TEXT,

    CONSTRAINT "KompraCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryAddress" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DeliveryAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "hexCode" TEXT,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostLines" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "itemId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CostLines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOrder" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "scheduleId" INTEGER,
    "supplierEmail" TEXT NOT NULL,
    "supplierToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "status" "SupplierOrderStatus" NOT NULL DEFAULT 'pending',
    "supplierMessage" TEXT,
    "userMessage" TEXT,
    "expectedArrival" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "cycleId" INTEGER,

    CONSTRAINT "SupplierOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOrderItem" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "orderId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "requestedQty" DOUBLE PRECISION NOT NULL,
    "deliveredQty" DOUBLE PRECISION,
    "confirmedQty" DOUBLE PRECISION,
    "expiryStartDate" TIMESTAMP(3),
    "expiryEndDate" TIMESTAMP(3),
    "exactExpiryDate" TIMESTAMP(3),

    CONSTRAINT "SupplierOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockCycle" (
    "id" SERIAL NOT NULL,
    "scheduleId" INTEGER NOT NULL,
    "orgId" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "emailRecipient" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "address" TEXT,
    "branchId" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "outletId" INTEGER,

    CONSTRAINT "RestockCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockCycleItem" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "cycleId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RestockCycleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "itemId" INTEGER NOT NULL,
    "orgId" INTEGER NOT NULL,
    "orderId" INTEGER,
    "quantity" DOUBLE PRECISION NOT NULL,
    "remainingQty" DOUBLE PRECISION NOT NULL,
    "expiryStartDate" TIMESTAMP(3),
    "expiryEndDate" TIMESTAMP(3),
    "exactExpiryDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockSchedule" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "recurrence" "RecurrenceType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "timeOfDay" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "emailRecipient" TEXT NOT NULL,
    "emailFrom" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "lastTriggeredAt" TIMESTAMP(3),
    "customTimes" JSONB,
    "branchId" INTEGER,
    "outletId" INTEGER,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "RestockSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RestockScheduleItem" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "scheduleId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "timeOfDay" TEXT,

    CONSTRAINT "RestockScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "type" "MediaType",
    "itemId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLocation" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "StockLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "email" TEXT,
    "webUrl" TEXT,
    "contactNumber" TEXT,
    "name" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "transactionId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "priceAtSale" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitId" INTEGER,
    "unitName" TEXT,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "discountQuantity" DOUBLE PRECISION DEFAULT 0,
    "discountRate" DOUBLE PRECISION DEFAULT 0,
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "originalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatExclusivePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costSnapshot" DOUBLE PRECISION,
    "priceSnapshot" DOUBLE PRECISION,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("transactionId","itemId")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "cashierId" INTEGER,
    "total" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "cashReceived" DOUBLE PRECISION,
    "change" DOUBLE PRECISION,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "Status" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerDetailsId" INTEGER,
    "customerType" "CustomerType" NOT NULL DEFAULT 'REGULAR',
    "scPwdCustomerId" TEXT,
    "isVatExempt" BOOLEAN NOT NULL DEFAULT false,
    "scPwdDiscountAmt" DOUBLE PRECISION,
    "vatExemptAmount" DOUBLE PRECISION,
    "vatExemptSale" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatExemptRefNo" TEXT,
    "vatExemptType" "VatExemptType",
    "discountType" "DiscountType" NOT NULL DEFAULT 'NONE',
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPax" INTEGER,
    "scPwdPax" INTEGER,
    "outletPromoId" INTEGER,
    "promoDiscountAmt" DOUBLE PRECISION,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScPwdCustomer" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER,
    "fullName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "oscaId" TEXT,
    "govId" TEXT,
    "idType" TEXT NOT NULL,
    "customerType" "CustomerType" NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "contactNumber" TEXT,
    "address" TEXT,
    "bnpcCapManuallyReached" BOOLEAN NOT NULL DEFAULT false,
    "bnpcCapManualReason" TEXT,
    "isRepresentative" BOOLEAN NOT NULL DEFAULT false,
    "representativeName" TEXT,
    "representativeIdNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ScPwdCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDeviceToken" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "minStock" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "lowStock" BOOLEAN NOT NULL,
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "label" TEXT NOT NULL,
    "color" TEXT,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "itemId" INTEGER,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "name" TEXT NOT NULL,
    "permissionsVersion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Center" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "label" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "Center_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubCenter" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "label" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "SubCenter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTitle" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "label" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "code" TEXT,

    CONSTRAINT "AccountTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" "EmployeeStatus" NOT NULL,
    "salary" DOUBLE PRECISION NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryHistory" (
    "id" TEXT NOT NULL,
    "ammount" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,

    CONSTRAINT "SalaryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakDuration" INTEGER NOT NULL DEFAULT 0,
    "orgId" INTEGER NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserShift" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "shiftId" INTEGER NOT NULL,
    "shiftDate" TIMESTAMP(3) NOT NULL,
    "timeIn" TIMESTAMP(3),
    "timeOut" TIMESTAMP(3),
    "breakStart" TIMESTAMP(3),
    "breakEnd" TIMESTAMP(3),
    "photoIn" TEXT,
    "photoOut" TEXT,
    "photoBreakStart" TEXT,
    "photoBreakEnd" TEXT,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "orgId" INTEGER NOT NULL,
    "noteBreakEnd" TEXT,
    "noteBreakStart" TEXT,
    "noteIn" TEXT,
    "noteOut" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GISRow" (
    "main" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL,
    "credit" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "accountTitleId" INTEGER NOT NULL,
    "centerId" INTEGER NOT NULL,
    "subCenterId" INTEGER NOT NULL,
    "id" SERIAL NOT NULL,

    CONSTRAINT "GISRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "account" TEXT NOT NULL,
    "begBal" DOUBLE PRECISION NOT NULL,
    "months" JSONB NOT NULL DEFAULT '{}',
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SummaryRow" (
    "itemCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "opExPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computedCost" DOUBLE PRECISION NOT NULL,
    "costContribution" DOUBLE PRECISION NOT NULL,
    "sellingPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT,
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "itemId" INTEGER,
    "itemName" TEXT,
    "accountTitleId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "centerId" INTEGER NOT NULL,
    "subCenterId" INTEGER NOT NULL,
    "id" SERIAL NOT NULL,
    "vatTypeId" INTEGER NOT NULL,
    "baseCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costLines" JSONB DEFAULT '[]',
    "grossProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "opExAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatInput" DOUBLE PRECISION DEFAULT 0,
    "vatOutput" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "SummaryRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_cart" (
    "id" BIGSERIAL NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "api_cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_cartitem" (
    "id" BIGSERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "branch_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "cart_id" BIGINT NOT NULL,

    CONSTRAINT "api_cartitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_deliveryaddress" (
    "id" BIGSERIAL NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "barangay" VARCHAR(100) NOT NULL,
    "street_address" VARCHAR(255) NOT NULL,
    "postal_code" VARCHAR(10) NOT NULL,
    "label" VARCHAR(20) NOT NULL,
    "is_default" BOOLEAN NOT NULL,
    "lat" DECIMAL(12,9) NOT NULL,
    "lng" DECIMAL(12,9) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "api_deliveryaddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_order" (
    "id" BIGSERIAL NOT NULL,
    "order_number" VARCHAR(30) NOT NULL,
    "branch_id" INTEGER,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shipping_fee" DECIMAL(12,2) NOT NULL,
    "discount_amount" DECIMAL(12,2) NOT NULL,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "payment_status" VARCHAR(20) NOT NULL,
    "order_status" VARCHAR(20) NOT NULL,
    "notes" TEXT,
    "placed_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "delivery_address_id" BIGINT,
    "user_id" BIGINT NOT NULL,
    "courierId" INTEGER,

    CONSTRAINT "api_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_orderitem" (
    "id" BIGSERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "order_id" BIGINT NOT NULL,

    CONSTRAINT "api_orderitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_payment" (
    "id" BIGSERIAL NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "payment_reference" VARCHAR(100),
    "payment_intent_id" VARCHAR(100),
    "amount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "order_id" BIGINT NOT NULL,

    CONSTRAINT "api_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_review" (
    "id" BIGSERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "api_review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_store" (
    "id" BIGSERIAL NOT NULL,
    "store_name" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "zip_code" VARCHAR(10) NOT NULL,
    "business_permit" VARCHAR(100) NOT NULL,
    "dti_sec_registration" VARCHAR(100) NOT NULL,
    "status" VARCHAR(15) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "api_store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_supplier" (
    "id" BIGSERIAL NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "business_type" VARCHAR(100) NOT NULL,
    "product_category" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "zip_code" VARCHAR(10) NOT NULL,
    "min_order_value" DECIMAL(12,2) NOT NULL,
    "delivery_areas" TEXT NOT NULL,
    "registration_cert" VARCHAR(100) NOT NULL,
    "bir_2303" VARCHAR(100) NOT NULL,
    "catalog" VARCHAR(100),
    "status" VARCHAR(15) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "api_supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_user" (
    "id" BIGSERIAL NOT NULL,
    "password" VARCHAR(128) NOT NULL,
    "last_login" TIMESTAMPTZ(6),
    "is_superuser" BOOLEAN NOT NULL,
    "first_name" VARCHAR(150) NOT NULL,
    "last_name" VARCHAR(150) NOT NULL,
    "is_staff" BOOLEAN NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "date_joined" TIMESTAMPTZ(6) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "contact_number" VARCHAR(11) NOT NULL,
    "is_verified" BOOLEAN NOT NULL,
    "otp" VARCHAR(6),
    "date_of_birth" DATE,
    "gender" VARCHAR(10),
    "role" VARCHAR(10) NOT NULL,
    "profile_image" VARCHAR(255),

    CONSTRAINT "api_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_user_groups" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "group_id" INTEGER NOT NULL,

    CONSTRAINT "api_user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_user_user_permissions" (
    "id" BIGSERIAL NOT NULL,
    "user_id" BIGINT NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "api_user_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_wishlist" (
    "id" BIGSERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "api_wishlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,

    CONSTRAINT "auth_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_group_permissions" (
    "id" BIGSERIAL NOT NULL,
    "group_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "auth_group_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_permission" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "codename" VARCHAR(100) NOT NULL,

    CONSTRAINT "auth_permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_admin_log" (
    "id" SERIAL NOT NULL,
    "action_time" TIMESTAMPTZ(6) NOT NULL,
    "object_id" TEXT,
    "object_repr" VARCHAR(200) NOT NULL,
    "action_flag" SMALLINT NOT NULL,
    "change_message" TEXT NOT NULL,
    "content_type_id" INTEGER,
    "user_id" BIGINT NOT NULL,

    CONSTRAINT "django_admin_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_content_type" (
    "id" SERIAL NOT NULL,
    "app_label" VARCHAR(100) NOT NULL,
    "model" VARCHAR(100) NOT NULL,

    CONSTRAINT "django_content_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "django_migrations" (
    "id" BIGSERIAL NOT NULL,
    "app" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "applied" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "django_migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentKey" TEXT,
    "access" "Access" NOT NULL DEFAULT 'SELLER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionPermission" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT false,
    "canCreate" BOOLEAN NOT NULL DEFAULT false,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PositionPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermissionOverride" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "pageId" TEXT NOT NULL,
    "canView" BOOLEAN,
    "canCreate" BOOLEAN,
    "canEdit" BOOLEAN,
    "canDelete" BOOLEAN,

    CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionControlPermission" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "controlKey" TEXT NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PositionControlPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "pageKey" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "recordId" TEXT,
    "recordType" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountAudit" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "customerId" TEXT,
    "oscaGovId" TEXT,
    "itemId" INTEGER,
    "salesOrderId" TEXT,
    "transactionId" INTEGER,
    "kompraOrderId" INTEGER,
    "customItemName" TEXT,
    "discountType" "DiscountType" NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL,
    "eligibleAmount" DOUBLE PRECISION,
    "runningWeeklyBnpcTotal" DOUBLE PRECISION,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DiscountAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCourierPreference" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER NOT NULL,
    "courier_id" INTEGER NOT NULL,

    CONSTRAINT "OrderCourierPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierCatalog" (
    "id" TEXT NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierItem" (
    "id" TEXT NOT NULL,
    "catalogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "unit" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "isVatExempt" BOOLEAN NOT NULL DEFAULT false,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.12,
    "moq" INTEGER NOT NULL DEFAULT 1,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceTier" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivedItemMap" (
    "id" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "buyerOrgId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivedItemMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "buyerOrgId" INTEGER NOT NULL,
    "supplierOrgId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "status" "POStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "requestedDate" TIMESTAMP(3),
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "POLineItem" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "supplierItemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "POLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "driverName" TEXT,
    "driverContact" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOutletLink" (
    "id" TEXT NOT NULL,
    "supplierOrgId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierOutletLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVerification" (
    "id" TEXT NOT NULL,
    "orgId" INTEGER NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "agentType" "AgentType" NOT NULL,
    "organizationId" INTEGER,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "trustTier" TEXT NOT NULL DEFAULT 'FREE',
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "isDevSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentVerification" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AgentVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "targetPrice" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusKm" DOUBLE PRECISION DEFAULT 10,
    "status" "MandateStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateOffer" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "supplierOrgId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "availableQty" DOUBLE PRECISION NOT NULL,
    "terms" TEXT,
    "status" "MandateOfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MandateOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "heldBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedgerEntry" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "sourceType" "LedgerSourceType" NOT NULL,
    "referenceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "status" "LedgerEntryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutMethod" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "type" "PayoutMethodType" NOT NULL,
    "accountName" TEXT NOT NULL,
    "maskedAccountNumber" TEXT NOT NULL,
    "bankName" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PayoutMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "payoutMethodId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" INTEGER NOT NULL,
    "approvedById" INTEGER,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentGatewayCredential" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "environment" "Environment" NOT NULL,
    "publicKey" TEXT,
    "secretKeyEncrypted" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentGatewayCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "environment" "Environment" NOT NULL,
    "gatewayReference" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "relatedType" "PaymentRelatedType" NOT NULL,
    "relatedId" TEXT NOT NULL,
    "payerOrgId" INTEGER,
    "payerAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MandateTransaction" (
    "id" TEXT NOT NULL,
    "mandateId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "supplierOrgId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "feeAmount" DOUBLE PRECISION NOT NULL,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "settlementType" "SettlementType" NOT NULL DEFAULT 'INSTANT',
    "status" "MandateTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "paymentTransactionId" TEXT,
    "linkedPoId" TEXT,
    "environment" "Environment" NOT NULL DEFAULT 'PRODUCTION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MandateTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowRelease" (
    "id" TEXT NOT NULL,
    "mandateTransactionId" TEXT NOT NULL,
    "buyerProofUrl" TEXT,
    "sellerProofUrl" TEXT,
    "buyerConfirmedAt" TIMESTAMP(3),
    "sellerConfirmedAt" TIMESTAMP(3),
    "autoReleaseAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "disputeStatus" "DisputeStatus" NOT NULL DEFAULT 'NONE',
    "disputeReason" TEXT,
    "resolvedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeRule" (
    "id" TEXT NOT NULL,
    "appliesTo" "FeeApplication" NOT NULL,
    "category" TEXT,
    "unitType" TEXT,
    "rateType" "FeeRateType" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "tierModifier" DOUBLE PRECISION DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FeeRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisibilityRule" (
    "id" TEXT NOT NULL,
    "agentTier" TEXT NOT NULL,
    "supplierPlan" "SubscriptionPlan" NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "rankBoost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "VisibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ItemToItemUnit" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ItemToItemUnit_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ColorToItem" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ColorToItem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orgId_key" ON "Subscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_orgId_username_key" ON "User"("orgId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "User_orgId_email_key" ON "User"("orgId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PaymongoAPIKeys_ownerId_key" ON "PaymongoAPIKeys"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_orgId_name_key" ON "Branch"("orgId", "name");

-- CreateIndex
CREATE INDEX "Contact_orgId_idx" ON "Contact"("orgId");

-- CreateIndex
CREATE INDEX "Contact_orgId_branchId_idx" ON "Contact"("orgId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceLocation_branchId_key" ON "PlaceLocation"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_code_key" ON "Outlet"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Outlet_orgId_code_key" ON "Outlet"("orgId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "PromoType_name_key" ON "PromoType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PromoType_orgId_name_key" ON "PromoType"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "OutletPromo_outletId_promoTypeId_key" ON "OutletPromo"("outletId", "promoTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "OutletStaff_outletId_userId_key" ON "OutletStaff"("outletId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_outletId_key" ON "Inventory"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItems_locationId_key" ON "InventoryItems"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItems_inventoryId_itemId_key" ON "InventoryItems"("inventoryId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCategory_name_key" ON "ItemCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrgItemCategory_orgId_name_key" ON "OrgItemCategory"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ItemGroup_orgId_name_key" ON "ItemGroup"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "VatType_orgId_name_key" ON "VatType"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Item_orgId_name_key" ON "Item"("orgId", "name");

-- CreateIndex
CREATE INDEX "ItemPriceHistory_itemId_effectiveAt_idx" ON "ItemPriceHistory"("itemId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_orderNumber_key" ON "SalesOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "SalesOrder_orgId_idx" ON "SalesOrder"("orgId");

-- CreateIndex
CREATE INDEX "SalesOrder_orgId_status_idx" ON "SalesOrder"("orgId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_orgId_orderMode_idx" ON "SalesOrder"("orgId", "orderMode");

-- CreateIndex
CREATE INDEX "SalesOrder_scPwdCustomerId_idx" ON "SalesOrder"("scPwdCustomerId");

-- CreateIndex
CREATE INDEX "SalesOrder_outletId_idx" ON "SalesOrder"("outletId");

-- CreateIndex
CREATE INDEX "ExtraCharge_salesOrderId_idx" ON "ExtraCharge"("salesOrderId");

-- CreateIndex
CREATE INDEX "SalesOrderItem_salesOrderId_idx" ON "SalesOrderItem"("salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrderDelivery_salesOrderId_key" ON "SalesOrderDelivery"("salesOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ItemUnit_unitName_key" ON "ItemUnit"("unitName");

-- CreateIndex
CREATE INDEX "InventoryItemUnit_inventoryItemId_idx" ON "InventoryItemUnit"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItemUnit_inventoryItemId_unitName_key" ON "InventoryItemUnit"("inventoryItemId", "unitName");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerDetails_transactionId_key" ON "CustomerDetails"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "KompraCOrder_transactionNumber_key" ON "KompraCOrder"("transactionNumber");

-- CreateIndex
CREATE INDEX "KompraCOrder_scPwdCustomerId_idx" ON "KompraCOrder"("scPwdCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "KompraCOrderItem_orderId_inventoryItemId_key" ON "KompraCOrderItem"("orderId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "KompraCDeliveryTracking_orderId_statusAt_idx" ON "KompraCDeliveryTracking"("orderId", "statusAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutletDeliveryConfig_outletId_key" ON "OutletDeliveryConfig"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "OutletItemSearchIndex_inventoryItemId_key" ON "OutletItemSearchIndex"("inventoryItemId");

-- CreateIndex
CREATE INDEX "OutletItemSearchIndex_itemId_quantity_idx" ON "OutletItemSearchIndex"("itemId", "quantity");

-- CreateIndex
CREATE INDEX "OutletItemSearchIndex_outletId_idx" ON "OutletItemSearchIndex"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "OutletItemSearchIndex_outletId_itemId_key" ON "OutletItemSearchIndex"("outletId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "KompraCustomer_email_key" ON "KompraCustomer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "KompraCustomer_phone_key" ON "KompraCustomer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Color_name_key" ON "Color"("name");

-- CreateIndex
CREATE INDEX "CostLines_itemId_idx" ON "CostLines"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierOrder_supplierToken_key" ON "SupplierOrder"("supplierToken");

-- CreateIndex
CREATE INDEX "SupplierOrder_orgId_status_idx" ON "SupplierOrder"("orgId", "status");

-- CreateIndex
CREATE INDEX "SupplierOrder_supplierToken_idx" ON "SupplierOrder"("supplierToken");

-- CreateIndex
CREATE INDEX "SupplierOrderItem_orderId_idx" ON "SupplierOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "RestockCycle_scheduleId_scheduledAt_idx" ON "RestockCycle"("scheduleId", "scheduledAt");

-- CreateIndex
CREATE INDEX "RestockCycle_orgId_scheduledAt_idx" ON "RestockCycle"("orgId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "RestockCycleItem_cycleId_itemId_key" ON "RestockCycleItem"("cycleId", "itemId");

-- CreateIndex
CREATE INDEX "StockBatch_itemId_expiryStartDate_idx" ON "StockBatch"("itemId", "expiryStartDate");

-- CreateIndex
CREATE INDEX "StockBatch_itemId_exactExpiryDate_idx" ON "StockBatch"("itemId", "exactExpiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "RestockScheduleItem_scheduleId_itemId_key" ON "RestockScheduleItem"("scheduleId", "itemId");

-- CreateIndex
CREATE INDEX "Media_itemId_sortOrder_idx" ON "Media"("itemId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_orgId_name_key" ON "Brand"("orgId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ScPwdCustomer_oscaId_key" ON "ScPwdCustomer"("oscaId");

-- CreateIndex
CREATE UNIQUE INDEX "ScPwdCustomer_govId_key" ON "ScPwdCustomer"("govId");

-- CreateIndex
CREATE INDEX "ScPwdCustomer_orgId_idx" ON "ScPwdCustomer"("orgId");

-- CreateIndex
CREATE INDEX "ScPwdCustomer_idNumber_idx" ON "ScPwdCustomer"("idNumber");

-- CreateIndex
CREATE INDEX "ScPwdCustomer_oscaId_idx" ON "ScPwdCustomer"("oscaId");

-- CreateIndex
CREATE INDEX "ScPwdCustomer_govId_idx" ON "ScPwdCustomer"("govId");

-- CreateIndex
CREATE INDEX "ScPwdCustomer_fullName_idx" ON "ScPwdCustomer"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "ScPwdCustomer_orgId_fullName_contactNumber_dateOfBirth_osca_key" ON "ScPwdCustomer"("orgId", "fullName", "contactNumber", "dateOfBirth", "oscaId");

-- CreateIndex
CREATE UNIQUE INDEX "ScPwdCustomer_orgId_fullName_contactNumber_dateOfBirth_govI_key" ON "ScPwdCustomer"("orgId", "fullName", "contactNumber", "dateOfBirth", "govId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerDeviceToken_token_key" ON "CustomerDeviceToken"("token");

-- CreateIndex
CREATE INDEX "InventoryItem_orgId_idx" ON "InventoryItem"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_orgId_label_key" ON "Department"("orgId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Center_orgId_label_key" ON "Center"("orgId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "SubCenter_orgId_label_key" ON "SubCenter"("orgId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "AccountTitle_orgId_label_key" ON "AccountTitle"("orgId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_orgId_idx" ON "Employee"("orgId");

-- CreateIndex
CREATE INDEX "Employee_department_idx" ON "Employee"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_orgId_email_key" ON "Employee"("orgId", "email");

-- CreateIndex
CREATE INDEX "Shift_orgId_idx" ON "Shift"("orgId");

-- CreateIndex
CREATE INDEX "UserShift_userId_idx" ON "UserShift"("userId");

-- CreateIndex
CREATE INDEX "UserShift_shiftId_idx" ON "UserShift"("shiftId");

-- CreateIndex
CREATE UNIQUE INDEX "UserShift_userId_shiftId_key" ON "UserShift"("userId", "shiftId");

-- CreateIndex
CREATE INDEX "Attendance_userId_shiftDate_idx" ON "Attendance"("userId", "shiftDate");

-- CreateIndex
CREATE INDEX "Attendance_shiftId_shiftDate_idx" ON "Attendance"("shiftId", "shiftDate");

-- CreateIndex
CREATE INDEX "Attendance_orgId_shiftDate_idx" ON "Attendance"("orgId", "shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_userId_shiftDate_key" ON "Attendance"("userId", "shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "GISRow_id_key" ON "GISRow"("id");

-- CreateIndex
CREATE INDEX "GISRow_orgId_idx" ON "GISRow"("orgId");

-- CreateIndex
CREATE INDEX "GISRow_orgId_createdAt_idx" ON "GISRow"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Budget_orgId_year_idx" ON "Budget"("orgId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "SummaryRow_id_key" ON "SummaryRow"("id");

-- CreateIndex
CREATE INDEX "SummaryRow_orgId_idx" ON "SummaryRow"("orgId");

-- CreateIndex
CREATE INDEX "SummaryRow_orgId_createdAt_idx" ON "SummaryRow"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "api_cart_user_id_key" ON "api_cart"("user_id");

-- CreateIndex
CREATE INDEX "api_cartitem_cart_id_26c2013b" ON "api_cartitem"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_cartitem_cart_id_product_id_branch_id_f5ebbd4b_uniq" ON "api_cartitem"("cart_id", "product_id", "branch_id");

-- CreateIndex
CREATE INDEX "api_deliveryaddress_user_id_51efe5a9" ON "api_deliveryaddress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_order_order_number_key" ON "api_order"("order_number");

-- CreateIndex
CREATE INDEX "api_order_delivery_address_id_025337a3" ON "api_order"("delivery_address_id");

-- CreateIndex
CREATE INDEX "api_order_order_number_10840d1e_like" ON "api_order"("order_number");

-- CreateIndex
CREATE INDEX "api_order_user_id_52781ff0" ON "api_order"("user_id");

-- CreateIndex
CREATE INDEX "api_orderitem_order_id_f9c0afc0" ON "api_orderitem"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_payment_order_id_key" ON "api_payment"("order_id");

-- CreateIndex
CREATE INDEX "api_review_user_id_8bf97ad4" ON "api_review"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_review_user_id_product_id_62dfd71f_uniq" ON "api_review"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_store_user_id_key" ON "api_store"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_supplier_user_id_key" ON "api_supplier"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_user_email_key" ON "api_user"("email");

-- CreateIndex
CREATE INDEX "api_user_email_9ef5afa6_like" ON "api_user"("email");

-- CreateIndex
CREATE INDEX "api_user_groups_group_id_3af85785" ON "api_user_groups"("group_id");

-- CreateIndex
CREATE INDEX "api_user_groups_user_id_a5ff39fa" ON "api_user_groups"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_user_groups_user_id_group_id_9c7ddfb5_uniq" ON "api_user_groups"("user_id", "group_id");

-- CreateIndex
CREATE INDEX "api_user_user_permissions_permission_id_305b7fea" ON "api_user_user_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "api_user_user_permissions_user_id_f3945d65" ON "api_user_user_permissions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_user_user_permissions_user_id_permission_id_a06dd704_uniq" ON "api_user_user_permissions"("user_id", "permission_id");

-- CreateIndex
CREATE INDEX "api_wishlist_user_id_798e25cf" ON "api_wishlist"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_wishlist_user_id_product_id_c48793dd_uniq" ON "api_wishlist"("user_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_group_name_key" ON "auth_group"("name");

-- CreateIndex
CREATE INDEX "auth_group_name_a6ea08ec_like" ON "auth_group"("name");

-- CreateIndex
CREATE INDEX "auth_group_permissions_group_id_b120cbf9" ON "auth_group_permissions"("group_id");

-- CreateIndex
CREATE INDEX "auth_group_permissions_permission_id_84c5c92e" ON "auth_group_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_group_permissions_group_id_permission_id_0cd325b0_uniq" ON "auth_group_permissions"("group_id", "permission_id");

-- CreateIndex
CREATE INDEX "auth_permission_content_type_id_2f476e4b" ON "auth_permission"("content_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_permission_content_type_id_codename_01ab375a_uniq" ON "auth_permission"("content_type_id", "codename");

-- CreateIndex
CREATE INDEX "django_admin_log_content_type_id_c4bce8eb" ON "django_admin_log"("content_type_id");

-- CreateIndex
CREATE INDEX "django_admin_log_user_id_c564eba6" ON "django_admin_log"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "django_content_type_app_label_model_76bd3d3b_uniq" ON "django_content_type"("app_label", "model");

-- CreateIndex
CREATE UNIQUE INDEX "Page_key_key" ON "Page"("key");

-- CreateIndex
CREATE INDEX "DiscountAudit_oscaGovId_idx" ON "DiscountAudit"("oscaGovId");

-- CreateIndex
CREATE INDEX "DiscountAudit_customerId_idx" ON "DiscountAudit"("customerId");

-- CreateIndex
CREATE INDEX "DiscountAudit_createdAt_idx" ON "DiscountAudit"("createdAt");

-- CreateIndex
CREATE INDEX "DiscountAudit_customerId_createdAt_idx" ON "DiscountAudit"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "DiscountAudit_oscaGovId_createdAt_idx" ON "DiscountAudit"("oscaGovId", "createdAt");

-- CreateIndex
CREATE INDEX "DiscountAudit_salesOrderId_idx" ON "DiscountAudit"("salesOrderId");

-- CreateIndex
CREATE INDEX "DiscountAudit_transactionId_idx" ON "DiscountAudit"("transactionId");

-- CreateIndex
CREATE INDEX "DiscountAudit_kompraOrderId_idx" ON "DiscountAudit"("kompraOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCatalog_organizationId_key" ON "SupplierCatalog"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierItem_catalogId_sku_key" ON "SupplierItem"("catalogId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "ReceivedItemMap_supplierItemId_buyerOrgId_outletId_key" ON "ReceivedItemMap"("supplierItemId", "buyerOrgId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Delivery_poId_key" ON "Delivery"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierOutletLink_supplierOrgId_outletId_key" ON "SupplierOutletLink"("supplierOrgId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "BusinessVerification_orgId_status_idx" ON "BusinessVerification"("orgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE INDEX "Agent_organizationId_idx" ON "Agent"("organizationId");

-- CreateIndex
CREATE INDEX "Agent_agentType_verificationStatus_idx" ON "Agent"("agentType", "verificationStatus");

-- CreateIndex
CREATE INDEX "AgentVerification_agentId_status_idx" ON "AgentVerification"("agentId", "status");

-- CreateIndex
CREATE INDEX "Mandate_agentId_status_idx" ON "Mandate"("agentId", "status");

-- CreateIndex
CREATE INDEX "Mandate_category_unitType_idx" ON "Mandate"("category", "unitType");

-- CreateIndex
CREATE INDEX "MandateOffer_mandateId_status_idx" ON "MandateOffer"("mandateId", "status");

-- CreateIndex
CREATE INDEX "MandateOffer_supplierOrgId_status_idx" ON "MandateOffer"("supplierOrgId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_orgId_key" ON "Wallet"("orgId");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_walletId_createdAt_idx" ON "WalletLedgerEntry"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_sourceType_referenceId_idx" ON "WalletLedgerEntry"("sourceType", "referenceId");

-- CreateIndex
CREATE INDEX "PayoutMethod_orgId_idx" ON "PayoutMethod"("orgId");

-- CreateIndex
CREATE INDEX "Withdrawal_walletId_status_idx" ON "Withdrawal"("walletId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGatewayCredential_orgId_provider_environment_key" ON "PaymentGatewayCredential"("orgId", "provider", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentTransaction_gatewayReference_key" ON "PaymentTransaction"("gatewayReference");

-- CreateIndex
CREATE INDEX "PaymentTransaction_relatedType_relatedId_idx" ON "PaymentTransaction"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "PaymentTransaction_provider_environment_status_idx" ON "PaymentTransaction"("provider", "environment", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MandateTransaction_mandateId_key" ON "MandateTransaction"("mandateId");

-- CreateIndex
CREATE INDEX "MandateTransaction_supplierOrgId_status_idx" ON "MandateTransaction"("supplierOrgId", "status");

-- CreateIndex
CREATE INDEX "MandateTransaction_agentId_status_idx" ON "MandateTransaction"("agentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowRelease_mandateTransactionId_key" ON "EscrowRelease"("mandateTransactionId");

-- CreateIndex
CREATE INDEX "FeeRule_appliesTo_category_unitType_isActive_idx" ON "FeeRule"("appliesTo", "category", "unitType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "VisibilityRule_agentTier_supplierPlan_key" ON "VisibilityRule"("agentTier", "supplierPlan");

-- CreateIndex
CREATE INDEX "_ItemToItemUnit_B_index" ON "_ItemToItemUnit"("B");

-- CreateIndex
CREATE INDEX "_ColorToItem_B_index" ON "_ColorToItem"("B");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymongoAPIKeys" ADD CONSTRAINT "PaymongoAPIKeys_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceLocation" ADD CONSTRAINT "PlaceLocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "PaymongoAPIKeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outlet" ADD CONSTRAINT "Outlet_vatTypeId_fkey" FOREIGN KEY ("vatTypeId") REFERENCES "VatType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoType" ADD CONSTRAINT "PromoType_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoType" ADD CONSTRAINT "PromoType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletPromo" ADD CONSTRAINT "OutletPromo_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletPromo" ADD CONSTRAINT "OutletPromo_promoTypeId_fkey" FOREIGN KEY ("promoTypeId") REFERENCES "PromoType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletPromo" ADD CONSTRAINT "OutletPromo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletStaff" ADD CONSTRAINT "OutletStaff_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletStaff" ADD CONSTRAINT "OutletStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItems" ADD CONSTRAINT "InventoryItems_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItems" ADD CONSTRAINT "InventoryItems_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItems" ADD CONSTRAINT "InventoryItems_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItems" ADD CONSTRAINT "InventoryItems_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgItemCategory" ADD CONSTRAINT "OrgItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgItemCategory" ADD CONSTRAINT "OrgItemCategory_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ItemGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgItemCategory" ADD CONSTRAINT "OrgItemCategory_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGroup" ADD CONSTRAINT "ItemGroup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCategoryMap" ADD CONSTRAINT "ItemCategoryMap_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "OrgItemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCategoryMap" ADD CONSTRAINT "ItemCategoryMap_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatType" ADD CONSTRAINT "VatType_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_orgCategoryId_fkey" FOREIGN KEY ("orgCategoryId") REFERENCES "OrgItemCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_vatTypeId_fkey" FOREIGN KEY ("vatTypeId") REFERENCES "VatType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCostHistory" ADD CONSTRAINT "ItemCostHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPriceHistory" ADD CONSTRAINT "ItemPriceHistory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPriceHistory" ADD CONSTRAINT "ItemPriceHistory_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_scPwdCustomerId_fkey" FOREIGN KEY ("scPwdCustomerId") REFERENCES "ScPwdCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraCharge" ADD CONSTRAINT "ExtraCharge_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderItem" ADD CONSTRAINT "SalesOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderDelivery" ADD CONSTRAINT "SalesOrderDelivery_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItemUnit" ADD CONSTRAINT "InventoryItemUnit_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDetails" ADD CONSTRAINT "CustomerDetails_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrder" ADD CONSTRAINT "KompraCOrder_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrder" ADD CONSTRAINT "KompraCOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "KompraCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrder" ADD CONSTRAINT "KompraCOrder_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "DeliveryAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrder" ADD CONSTRAINT "KompraCOrder_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrder" ADD CONSTRAINT "KompraCOrder_scPwdCustomerId_fkey" FOREIGN KEY ("scPwdCustomerId") REFERENCES "ScPwdCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrderItem" ADD CONSTRAINT "KompraCOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItems"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrderItem" ADD CONSTRAINT "KompraCOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrderItem" ADD CONSTRAINT "KompraCOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "KompraCOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrderItem" ADD CONSTRAINT "KompraCOrderItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryItemUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCOrderFee" ADD CONSTRAINT "KompraCOrderFee_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "KompraCOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KompraCDeliveryTracking" ADD CONSTRAINT "KompraCDeliveryTracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "KompraCOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletDeliveryConfig" ADD CONSTRAINT "OutletDeliveryConfig_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletItemSearchIndex" ADD CONSTRAINT "OutletItemSearchIndex_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletItemSearchIndex" ADD CONSTRAINT "OutletItemSearchIndex_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletItemSearchIndex" ADD CONSTRAINT "OutletItemSearchIndex_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "KompraCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostLines" ADD CONSTRAINT "CostLines_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "RestockCycle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RestockSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrderItem" ADD CONSTRAINT "SupplierOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrderItem" ADD CONSTRAINT "SupplierOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SupplierOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockCycle" ADD CONSTRAINT "RestockCycle_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockCycle" ADD CONSTRAINT "RestockCycle_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockCycle" ADD CONSTRAINT "RestockCycle_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockCycle" ADD CONSTRAINT "RestockCycle_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RestockSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockCycleItem" ADD CONSTRAINT "RestockCycleItem_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "RestockCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockCycleItem" ADD CONSTRAINT "RestockCycleItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockSchedule" ADD CONSTRAINT "RestockSchedule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockSchedule" ADD CONSTRAINT "RestockSchedule_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockSchedule" ADD CONSTRAINT "RestockSchedule_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockScheduleItem" ADD CONSTRAINT "RestockScheduleItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RestockScheduleItem" ADD CONSTRAINT "RestockScheduleItem_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "RestockSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "InventoryItemUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_scPwdCustomerId_fkey" FOREIGN KEY ("scPwdCustomerId") REFERENCES "ScPwdCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_outletPromoId_fkey" FOREIGN KEY ("outletPromoId") REFERENCES "OutletPromo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScPwdCustomer" ADD CONSTRAINT "ScPwdCustomer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDeviceToken" ADD CONSTRAINT "CustomerDeviceToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "KompraCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Center" ADD CONSTRAINT "Center_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubCenter" ADD CONSTRAINT "SubCenter_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTitle" ADD CONSTRAINT "AccountTitle_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryHistory" ADD CONSTRAINT "SalaryHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShift" ADD CONSTRAINT "UserShift_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserShift" ADD CONSTRAINT "UserShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GISRow" ADD CONSTRAINT "GISRow_accountTitleId_fkey" FOREIGN KEY ("accountTitleId") REFERENCES "AccountTitle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GISRow" ADD CONSTRAINT "GISRow_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GISRow" ADD CONSTRAINT "GISRow_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GISRow" ADD CONSTRAINT "GISRow_subCenterId_fkey" FOREIGN KEY ("subCenterId") REFERENCES "SubCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GISRow" ADD CONSTRAINT "GISRow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRow" ADD CONSTRAINT "SummaryRow_accountTitleId_fkey" FOREIGN KEY ("accountTitleId") REFERENCES "AccountTitle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRow" ADD CONSTRAINT "SummaryRow_centerId_fkey" FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRow" ADD CONSTRAINT "SummaryRow_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRow" ADD CONSTRAINT "SummaryRow_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRow" ADD CONSTRAINT "SummaryRow_subCenterId_fkey" FOREIGN KEY ("subCenterId") REFERENCES "SubCenter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRow" ADD CONSTRAINT "SummaryRow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryRow" ADD CONSTRAINT "SummaryRow_vatTypeId_fkey" FOREIGN KEY ("vatTypeId") REFERENCES "VatType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_cart" ADD CONSTRAINT "api_cart_user_id_79972181_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_cartitem" ADD CONSTRAINT "api_cartitem_cart_id_26c2013b_fk_api_cart_id" FOREIGN KEY ("cart_id") REFERENCES "api_cart"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_deliveryaddress" ADD CONSTRAINT "api_deliveryaddress_user_id_51efe5a9_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_order" ADD CONSTRAINT "api_order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_order" ADD CONSTRAINT "api_order_delivery_address_id_025337a3_fk_api_deliv" FOREIGN KEY ("delivery_address_id") REFERENCES "api_deliveryaddress"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_order" ADD CONSTRAINT "api_order_user_id_52781ff0_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_orderitem" ADD CONSTRAINT "api_orderitem_order_id_f9c0afc0_fk_api_order_id" FOREIGN KEY ("order_id") REFERENCES "api_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_payment" ADD CONSTRAINT "api_payment_order_id_7b6d4bf5_fk_api_order_id" FOREIGN KEY ("order_id") REFERENCES "api_order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_review" ADD CONSTRAINT "api_review_user_id_8bf97ad4_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_store" ADD CONSTRAINT "api_store_user_id_19eb3736_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_supplier" ADD CONSTRAINT "api_supplier_user_id_d696b80f_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_user_groups" ADD CONSTRAINT "api_user_groups_group_id_3af85785_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "auth_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_user_groups" ADD CONSTRAINT "api_user_groups_user_id_a5ff39fa_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_user_user_permissions" ADD CONSTRAINT "api_user_user_permis_permission_id_305b7fea_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "auth_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_user_user_permissions" ADD CONSTRAINT "api_user_user_permissions_user_id_f3945d65_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "api_wishlist" ADD CONSTRAINT "api_wishlist_user_id_798e25cf_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_group_permissions" ADD CONSTRAINT "auth_group_permissio_permission_id_84c5c92e_fk_auth_perm" FOREIGN KEY ("permission_id") REFERENCES "auth_permission"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_group_permissions" ADD CONSTRAINT "auth_group_permissions_group_id_b120cbf9_fk_auth_group_id" FOREIGN KEY ("group_id") REFERENCES "auth_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_permission" ADD CONSTRAINT "auth_permission_content_type_id_2f476e4b_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "django_content_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "django_admin_log" ADD CONSTRAINT "django_admin_log_content_type_id_c4bce8eb_fk_django_co" FOREIGN KEY ("content_type_id") REFERENCES "django_content_type"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "django_admin_log" ADD CONSTRAINT "django_admin_log_user_id_c564eba6_fk_api_user_id" FOREIGN KEY ("user_id") REFERENCES "api_user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PositionPermission" ADD CONSTRAINT "PositionPermission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionPermission" ADD CONSTRAINT "PositionPermission_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermissionOverride" ADD CONSTRAINT "UserPermissionOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionControlPermission" ADD CONSTRAINT "PositionControlPermission_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountAudit" ADD CONSTRAINT "DiscountAudit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscountAudit" ADD CONSTRAINT "DiscountAudit_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCourierPreference" ADD CONSTRAINT "fk_courier" FOREIGN KEY ("courier_id") REFERENCES "Courier"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "OrderCourierPreference" ADD CONSTRAINT "fk_order" FOREIGN KEY ("order_id") REFERENCES "KompraCOrder"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierItem" ADD CONSTRAINT "SupplierItem_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "SupplierCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceTier" ADD CONSTRAINT "PriceTier_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedItemMap" ADD CONSTRAINT "ReceivedItemMap_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedItemMap" ADD CONSTRAINT "ReceivedItemMap_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedItemMap" ADD CONSTRAINT "ReceivedItemMap_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivedItemMap" ADD CONSTRAINT "ReceivedItemMap_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POLineItem" ADD CONSTRAINT "POLineItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "POLineItem" ADD CONSTRAINT "POLineItem_supplierItemId_fkey" FOREIGN KEY ("supplierItemId") REFERENCES "SupplierItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOutletLink" ADD CONSTRAINT "SupplierOutletLink_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOutletLink" ADD CONSTRAINT "SupplierOutletLink_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessVerification" ADD CONSTRAINT "BusinessVerification_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentVerification" ADD CONSTRAINT "AgentVerification_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateOffer" ADD CONSTRAINT "MandateOffer_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateOffer" ADD CONSTRAINT "MandateOffer_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutMethod" ADD CONSTRAINT "PayoutMethod_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_payoutMethodId_fkey" FOREIGN KEY ("payoutMethodId") REFERENCES "PayoutMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentGatewayCredential" ADD CONSTRAINT "PaymentGatewayCredential_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateTransaction" ADD CONSTRAINT "MandateTransaction_mandateId_fkey" FOREIGN KEY ("mandateId") REFERENCES "Mandate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MandateTransaction" ADD CONSTRAINT "MandateTransaction_supplierOrgId_fkey" FOREIGN KEY ("supplierOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowRelease" ADD CONSTRAINT "EscrowRelease_mandateTransactionId_fkey" FOREIGN KEY ("mandateTransactionId") REFERENCES "MandateTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToItemUnit" ADD CONSTRAINT "_ItemToItemUnit_A_fkey" FOREIGN KEY ("A") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemToItemUnit" ADD CONSTRAINT "_ItemToItemUnit_B_fkey" FOREIGN KEY ("B") REFERENCES "ItemUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ColorToItem" ADD CONSTRAINT "_ColorToItem_A_fkey" FOREIGN KEY ("A") REFERENCES "Color"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ColorToItem" ADD CONSTRAINT "_ColorToItem_B_fkey" FOREIGN KEY ("B") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
