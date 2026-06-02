import json
import random
from django.utils import timezone
from rest_framework import serializers

from .models import (
    DeliveryAddress,
    PosDeliveryAddress,
    User,
    Store,
    Supplier,
    Inventoryitems,
    Itemcategory,
    Organization,
    Branch,
    Outlet,
    Cart,
    CartItem,
    Item,
    Inventoryitemunit,
    Kompracorder,
    Kompracorderitem,
    Kompracorderfee,
    Kompracustomer,
    Kompracdeliverytracking,
    Notification,
    Orgitemcategory,
    Courier,
    OrderCourierPreference,
)


# --- USER SERIALIZER ---
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "email",
            "contact_number",
            "gender",
            "date_of_birth",
            "role",
            "is_verified",
            "profile_image",
        ]
        read_only_fields = ["is_verified"]


# --- REGISTRATION SERIALIZER ---
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    # These capture Step 2 (Details) and Step 3 (Files) from your Frontend
    store_details = serializers.CharField(write_only=True, required=False)
    company_details = serializers.CharField(write_only=True, required=False)

    # Document Uploads for Sellers
    business_permit = serializers.FileField(write_only=True, required=False)
    dti_sec_registration = serializers.FileField(write_only=True, required=False)

    # Document Uploads for Suppliers
    registration_cert = serializers.FileField(write_only=True, required=False)
    bir_2303 = serializers.FileField(write_only=True, required=False)
    catalog = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "full_name",
            "email",
            "contact_number",
            "gender",
            "date_of_birth",
            "password",
            "role",
            "store_details",
            "company_details",
            "business_permit",
            "dti_sec_registration",
            "registration_cert",
            "bir_2303",
            "catalog",
        ]

    def create(self, validated_data):
        # 1. Extract JSON strings and Files
        store_json = validated_data.pop("store_details", None)
        company_json = validated_data.pop("company_details", None)

        # Extract Files
        files = {
            "business_permit": validated_data.pop("business_permit", None),
            "dti_sec_registration": validated_data.pop("dti_sec_registration", None),
            "registration_cert": validated_data.pop("registration_cert", None),
            "bir_2303": validated_data.pop("bir_2303", None),
            "catalog": validated_data.pop("catalog", None),
        }

        # 2. Create the Base User
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            contact_number=validated_data["contact_number"],
            gender=validated_data.get("gender"),
            date_of_birth=validated_data.get("date_of_birth"),
            role=validated_data.get("role", "CUSTOMER"),
        )

        if user.role == "CUSTOMER":
            Kompracustomer.objects.get_or_create(
                email=user.email,
                defaults={
                    "fullname": user.full_name,
                    "passwordhash": user.password,
                    "profilephoto": "",
                    "isverified": user.is_verified,
                    "isactive": True,
                    "createdat": timezone.now(),
                    "updatedat": timezone.now(),
                    "phone": user.contact_number,
                },
            )

        # 3. Handle Store Creation (SELLER)
        if user.role == "SELLER" and store_json:
            store_data = json.loads(store_json)
            Store.objects.create(
                user=user,
                business_permit=files["business_permit"],
                dti_sec_registration=files["dti_sec_registration"],
                **store_data,
            )

        # 4. Handle Supplier Creation (SUPPLIER)
        elif user.role == "SUPPLIER" and company_json:
            company_data = json.loads(company_json)
            Supplier.objects.create(
                user=user,
                registration_cert=files["registration_cert"],
                bir_2303=files["bir_2303"],
                catalog=files["catalog"],
                **company_data,
            )

        return user


# --- DELIVERY ADDRESS SERIALIZER ---
class DeliveryAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAddress
        fields = [
            "id",
            "full_name",
            "phone",
            "region",
            "province",
            "city",
            "barangay",
            "street_address",
            "postal_code",
            "label",
            "is_default",
            "lat",
            "lng",
        ]
        read_only_fields = ["id"]

    def validate_phone(self, value):
        if len(value) < 10:
            raise serializers.ValidationError("Phone number is too short.")
        return value


class ProductListSerializer(serializers.ModelSerializer):
    inventory_item_id = serializers.IntegerField(source="id", read_only=True)
    product_id = serializers.IntegerField(source="itemid.id", read_only=True)
    name = serializers.CharField(source="itemid.name", read_only=True)
    image = serializers.SerializerMethodField()
    description = serializers.CharField(source="itemid.description", allow_null=True, read_only=True)

    category_id = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    brand = serializers.CharField(source="itemid.brandid.name", allow_null=True, read_only=True)
    outlet_id = serializers.IntegerField(source="inventoryid.outletid.id", read_only=True)
    outlet_name = serializers.CharField(source="inventoryid.outletid.name", read_only=True)
    outlet_address = serializers.CharField(
        source="inventoryid.outletid.address",
        allow_null=True,
        read_only=True
    )
    branch_name = serializers.CharField(
        source="inventoryid.outletid.branchid.name",
        allow_null=True,
        read_only=True
    )

    class Meta:
        model = Inventoryitems
        fields = [
            "inventory_item_id",
            "product_id",
            "name",
            "image",
            "description",
            "category_id",
            "category_name",
            "brand",
            "price",
            "quantity",
            "outlet_id",
            "outlet_name",
            "outlet_address",
            "branch_name",
        ]

    def get_category_id(self, obj):
        if obj.itemid.categoryid:
            return obj.itemid.categoryid.id

        if obj.itemid.orgcategoryid and obj.itemid.orgcategoryid.categoryid:
            return obj.itemid.orgcategoryid.categoryid.id

        return None

    def get_category_name(self, obj):
        if obj.itemid.categoryid:
            return obj.itemid.categoryid.name

        if obj.itemid.orgcategoryid and obj.itemid.orgcategoryid.categoryid:
            return obj.itemid.orgcategoryid.categoryid.name

        if obj.itemid.orgcategoryid:
            return obj.itemid.orgcategoryid.name

        return None
    
    def get_image(self, obj):
        image = obj.itemid.image

        if not image:
            return None

        # If already a full Supabase URL
        if image.startswith("http"):
            return image

        # If somehow local path still exists
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(image)

        return image


class ProductDetailSerializer(serializers.ModelSerializer):
    inventory_item_id = serializers.IntegerField(source="id", read_only=True)
    product_id = serializers.IntegerField(source="itemid.id", read_only=True)
    name = serializers.CharField(source="itemid.name", read_only=True)
    image = serializers.SerializerMethodField()
    description = serializers.CharField(source="itemid.description", allow_null=True, read_only=True)

    category_id = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()

    brand = serializers.CharField(source="itemid.brandid.name", allow_null=True, read_only=True)
    outlet_id = serializers.IntegerField(source="inventoryid.outletid.id", read_only=True)
    outlet_name = serializers.CharField(source="inventoryid.outletid.name", read_only=True)
    outlet_address = serializers.CharField(
        source="inventoryid.outletid.address",
        allow_null=True,
        read_only=True
    )
    outlet_phone = serializers.CharField(
        source="inventoryid.outletid.phone",
        allow_null=True,
        read_only=True
    )
    branch_name = serializers.CharField(
        source="inventoryid.outletid.branchid.name",
        allow_null=True,
        read_only=True
    )
    branch_address = serializers.CharField(
        source="inventoryid.outletid.branchid.address",
        allow_null=True,
        read_only=True
    )
    branch_phone = serializers.CharField(
        source="inventoryid.outletid.branchid.phone",
        allow_null=True,
        read_only=True
    )

    class Meta:
        model = Inventoryitems
        fields = [
            "inventory_item_id",
            "product_id",
            "name",
            "image",
            "description",
            "category_id",
            "category_name",
            "brand",
            "price",
            "quantity",
            "outlet_id",
            "outlet_name",
            "outlet_address",
            "outlet_phone",
            "branch_name",
            "branch_address",
            "branch_phone",
        ]

    def get_category_id(self, obj):
        if obj.itemid.categoryid:
            return obj.itemid.categoryid.id

        if obj.itemid.orgcategoryid and obj.itemid.orgcategoryid.categoryid:
            return obj.itemid.orgcategoryid.categoryid.id

        return None

    def get_category_name(self, obj):
        if obj.itemid.categoryid:
            return obj.itemid.categoryid.name

        if obj.itemid.orgcategoryid and obj.itemid.orgcategoryid.categoryid:
            return obj.itemid.orgcategoryid.categoryid.name

        if obj.itemid.orgcategoryid:
            return obj.itemid.orgcategoryid.name

        return None
    
    def get_image(self, obj):
            image = obj.itemid.image

            if not image:
                return None

            # If already a full Supabase URL
            if image.startswith("http"):
                return image

            # If somehow local path still exists
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(image)

            return image


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Itemcategory
        fields = [
            "id",
            "name",
            "description",
            "icon",
            "product_count",
        ]
        

class OutletSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source="orgid.name", read_only=True)
    branch_id = serializers.IntegerField(source="branchid.id", read_only=True, allow_null=True)
    branch_name = serializers.CharField(source="branchid.name", read_only=True, allow_null=True)
    branch_address = serializers.CharField(source="branchid.address", read_only=True, allow_null=True)
    branch_phone = serializers.CharField(source="branchid.phone", read_only=True, allow_null=True)

    class Meta:
        model = Outlet
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "code",
            "outlettype",
            "isactive",
            "createdat",
            "latitude",
            "longitude",
            "bannerimage",
            "orgid",
            "org_name",
            "branch_id",
            "branch_name",
            "branch_address",
            "branch_phone",
        ]


class BranchSerializer(serializers.ModelSerializer):
    org_name = serializers.CharField(source="orgid.name", read_only=True)
    outlets = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id",
            "name",
            "address",
            "phone",
            "isactive",
            "createdat",
            "locationid",
            "orgid",
            "org_name",
            "outlets",
        ]

    def get_outlets(self, obj):
        outlets = Outlet.objects.filter(branchid=obj).order_by("name")
        return OutletSerializer(outlets, many=True).data


class OrganizationSerializer(serializers.ModelSerializer):
    branches = serializers.SerializerMethodField()
    total_branches = serializers.SerializerMethodField()
    total_outlets = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id",
            "name",
            "createdat",

            # ✅ ADD THESE
            "bannerimg",
            "contactnumber",
            "email",
            "location",
            "profilephoto",
            "facebooklink",
            "instagramlink",
            "twitterlink",
            "bio",

            # existing computed fields
            "branches",
            "total_branches",
            "total_outlets",
        ]

    def get_branches(self, obj):
        branches = Branch.objects.filter(orgid=obj, isactive=True).order_by("name")
        return BranchSerializer(branches, many=True).data

    def get_total_branches(self, obj):
        return Branch.objects.filter(orgid=obj, isactive=True).count()

    def get_total_outlets(self, obj):
        return Outlet.objects.filter(orgid=obj, isactive=True).count()



class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    outlet_name = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_id",
            "branch_id",
            "product_name",
            "image",
            "outlet_name",
            "quantity",
            "unit_price",
            "subtotal",
        ]

    def get_product_name(self, obj):
        try:
            inventory_item = Inventoryitems.objects.select_related("itemid").get(id=obj.product_id)
            return inventory_item.itemid.name
        except Inventoryitems.DoesNotExist:
            return None

    def get_image(self, obj):
        try:
            inventory_item = Inventoryitems.objects.select_related("itemid").get(id=obj.product_id)
            return inventory_item.itemid.image
        except Inventoryitems.DoesNotExist:
            return None

    def get_outlet_name(self, obj):
        try:
            inventory_item = Inventoryitems.objects.select_related("inventoryid__outletid").get(id=obj.product_id)
            return inventory_item.inventoryid.outletid.name
        except Inventoryitems.DoesNotExist:
            return None


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_quantity = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "items",
            "total_quantity",
            "total_amount",
            "created_at",
            "updated_at",
        ]

    def get_total_quantity(self, obj):
        return sum(item.quantity for item in obj.items.all())

    def get_total_amount(self, obj):
        return sum(item.subtotal for item in obj.items.all())


class KompracorderitemSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = Kompracorderitem
        fields = [
            "id",
            "itemid",
            "product_name",
            "quantity",
            "pricesnapshot",
            "subtotal",
        ]

    def get_product_name(self, obj):
        return obj.itemid.name if obj.itemid else None


class KompracdeliverytrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Kompracdeliverytracking
        fields = [
            "id",
            "event",
            "statusat",
            "currentlat",
            "currentlng",
            "note",
            "actortype",
            "actorid",
        ]


class CourierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Courier
        fields = ["id", "name", "phone"]


class KompracorderSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    tracking = serializers.SerializerMethodField()
    order_type = serializers.SerializerMethodField()
    outlet_name = serializers.CharField(source="outletid.name", read_only=True)
    delivery_address = serializers.SerializerMethodField()
    current_step = serializers.SerializerMethodField()
    delivery_fee = serializers.SerializerMethodField()
    couriers = serializers.SerializerMethodField()

    class Meta:
        model = Kompracorder
        fields = [
            "id",
            "transactionnumber",
            "subtotal",
            "total",
            "status",
            "paymentmethod",
            "paymentstatus",
            "customernote",
            "createdat",
            "items",
            "tracking",
            "order_type",
            "outlet_name",
            "delivery_address",
            "current_step",
            "delivery_fee",
            "couriers",
        ]

    def get_items(self, obj):
        items = Kompracorderitem.objects.filter(orderid=obj)
        return KompracorderitemSerializer(items, many=True).data

    def get_tracking(self, obj):
        tracking = Kompracdeliverytracking.objects.filter(orderid=obj).order_by("statusat")
        return KompracdeliverytrackingSerializer(tracking, many=True).data

    def get_order_type(self, obj):
        if obj.deliveryaddressid and obj.deliveryaddressid.label.lower() == "pickup":
            return "PICKUP"
        return "DELIVERY"

    def get_delivery_address(self, obj):
        if obj.deliveryaddressid:
            return obj.deliveryaddressid.address
        return None
    

    def get_current_step(self, obj):
        order_type = self.get_order_type(obj)
        status = str(obj.status).lower()

        if order_type == "pickup":
            pickup_status_map = {
                "pending": 1,
                "confirmed": 1,
                "preparing": 1,
                "ready": 2,
                "received": 3,
                "completed": 3,
            }
            return pickup_status_map.get(status, 1)

        delivery_status_map = {
            "pending": 1,
            "confirmed": 2,
            "preparing": 2,
            "ready": 3,
            "in_delivery": 4,
            "received": 5,
            "completed": 5,
        }
        return delivery_status_map.get(status, 1)
    

    def get_delivery_fee(self, obj):
        fee = Kompracorderfee.objects.filter(
            orderid=obj,
            type__iexact="delivery"
        ).first()

        return fee.amount if fee else 0
    
    
    def get_couriers(self, obj):
        preferences = OrderCourierPreference.objects.filter(order=obj)

        return [
            {
                "id": p.courier.id,
                "name": p.courier.name,
                "phone": p.courier.phone,
            }
            for p in preferences
        ]


class CheckoutSerializer(serializers.Serializer):
    outlet_id = serializers.IntegerField()
    delivery_address_id = serializers.IntegerField(required=False, allow_null=True)
    order_type = serializers.ChoiceField(choices=["DELIVERY", "PICKUP"])
    payment_method = serializers.CharField()
    customer_note = serializers.CharField(required=False, allow_blank=True)
    courier_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    def create(self, validated_data):
        user = self.context["request"].user

        try:
            cart = Cart.objects.get(user=user)
        except Cart.DoesNotExist:
            raise serializers.ValidationError("Cart not found.")

        cart_items = cart.items.all()
        if not cart_items.exists():
            raise serializers.ValidationError("Cart is empty.")



        try:
            outlet = Outlet.objects.get(id=validated_data["outlet_id"])
        except Outlet.DoesNotExist:
            raise serializers.ValidationError("Invalid outlet.")

        django_address = None
        delivery_address_id = validated_data.get("delivery_address_id")
        order_type = validated_data["order_type"]


        courier_ids = list(set(validated_data.get("courier_ids", [])))

        if order_type == "DELIVERY":
            if not courier_ids:
                raise serializers.ValidationError("Select at least 1 courier.")

            if len(courier_ids) > 3:
                raise serializers.ValidationError("You can select up to 3 couriers only.")

            valid_couriers = Courier.objects.filter(id__in=courier_ids)

            if len(valid_couriers) != len(courier_ids):
                raise serializers.ValidationError("One or more selected couriers are invalid.")

        if order_type == "DELIVERY":
            if not delivery_address_id:
                raise serializers.ValidationError("Delivery address is required.")

            try:
                django_address = DeliveryAddress.objects.get(
                    id=delivery_address_id,
                    user=user,
                )
            except DeliveryAddress.DoesNotExist:
                raise serializers.ValidationError("Invalid delivery address.")

        customer, _ = Kompracustomer.objects.get_or_create(
            email=user.email,
            defaults={
                "fullname": user.full_name,
                "passwordhash": user.password,
                "profilephoto": "",
                "isverified": user.is_verified,
                "isactive": True,
                "createdat": timezone.now(),
                "updatedat": timezone.now(),
                "phone": user.contact_number,
            },
        )

        # keep POS customer info updated too
        customer.fullname = user.full_name
        customer.phone = user.contact_number
        customer.isverified = user.is_verified
        customer.updatedat = timezone.now()
        customer.save()

        pos_address = None

        if django_address:
            full_address = (
                f"{django_address.street_address}, "
                f"{django_address.barangay}, "
                f"{django_address.city}, "
                f"{django_address.province}, "
                f"{django_address.region}, "
                f"{django_address.postal_code}"
            )

            pos_address, _ = PosDeliveryAddress.objects.get_or_create(
                customerid=customer,
                label=django_address.label,
                address=full_address,
                defaults={
                    "latitude": float(django_address.lat),
                    "longitude": float(django_address.lng),
                    "isdefault": django_address.is_default,
                    "createdat": timezone.now(),
                },
            )
        else:
            # pickup fallback address because KompraCOrder.deliveryAddressId cannot be null
            pickup_address = f"Pickup at {outlet.name}"
            if getattr(outlet, "address", None):
                pickup_address = f"{pickup_address}, {outlet.address}"

            pos_address, _ = PosDeliveryAddress.objects.get_or_create(
                customerid=customer,
                label="Pickup",
                address=pickup_address,
                defaults={
                    "latitude": 0.0,
                    "longitude": 0.0,
                    "isdefault": False,
                    "createdat": timezone.now(),
                },
            )

        subtotal = sum(float(item.subtotal) for item in cart_items)
        delivery_fee = 50 if order_type == "DELIVERY" else 0
        total = subtotal + delivery_fee
        transaction_number = f"KMP-{random.randint(100000, 999999)}"

        raw_payment_method = validated_data["payment_method"]
        payment_method_map = {
            "COD": "cash_on_delivery",
            "GCASH": "gcash",
            "PAYMAYA": "paymaya",
            "CARD": "card",
            "QRPH": "qrph",
            "PAY_AT_STORE": "cash_on_delivery",
            "ONLINE": "gcash",
        }
        payment_method_value = payment_method_map.get(raw_payment_method, raw_payment_method)

        order = Kompracorder.objects.create(
            transactionnumber=transaction_number,
            customerid=customer,
            outletid=outlet,
            deliveryaddressid=pos_address,
            subtotal=subtotal,
            total=total,
            status="pending",
            paymentmethod=payment_method_value,
            paymentstatus="pending",
            paymentreference="",
            ridername="",
            riderphone="",
            customernote=validated_data.get("customer_note", ""),
            outletnote="",
            createdat=timezone.now(),
            updatedat=timezone.now(),
        )

        # ✅ SAVE COURIER PREFERENCES
        if order_type == "DELIVERY":
            valid_couriers = Courier.objects.filter(id__in=courier_ids)

        for courier in valid_couriers:
            OrderCourierPreference.objects.create(
                order=order,
                courier=courier
            )

        for cart_item in cart_items:
            try:
                # 1. Get the inventory item and "lock" the row for the transaction
                inventory_item = Inventoryitems.objects.select_for_update().get(id=cart_item.product_id)
            except Inventoryitems.DoesNotExist:
                raise serializers.ValidationError(
                    f"Inventory item not found for cart item {cart_item.id}"
                )

            # 2. SAFETY CHECK: Ensure there is enough stock before proceeding
            if inventory_item.quantity < cart_item.quantity:
                raise serializers.ValidationError(
                    f"Insufficient stock for {inventory_item.itemid.name}. "
                    f"Available: {inventory_item.quantity}, Requested: {cart_item.quantity}"
                )

            # 3. DEDUCT THE STOCK <--- This is the missing piece
            inventory_item.quantity -= cart_item.quantity
            inventory_item.save()

            # 4. Create the Order Item (Your existing logic)
            Kompracorderitem.objects.create(
                orderid=order,
                inventoryitemid=inventory_item,
                itemid=inventory_item.itemid,
                quantity=cart_item.quantity,
                pricesnapshot=float(cart_item.unit_price),
                subtotal=float(cart_item.subtotal),
                unitid=None,
            )

        if delivery_fee > 0:
            Kompracorderfee.objects.create(
                orderid=order,
                type="delivery",
                label="Delivery Fee",
                amount=delivery_fee,
            )

        cart.items.all().delete()
        return order
    
    
    

class SearchProductSerializer(serializers.ModelSerializer):
    inventory_item_id = serializers.IntegerField(source="id", read_only=True)
    product_id = serializers.IntegerField(source="itemid.id", read_only=True)
    name = serializers.CharField(source="itemid.name", read_only=True)
    image = serializers.CharField(source="itemid.image", allow_null=True, read_only=True)
    description = serializers.CharField(source="itemid.description", allow_null=True, read_only=True)
    category_name = serializers.SerializerMethodField()
    outlet_id = serializers.IntegerField(source="inventoryid.outletid.id", read_only=True)
    outlet_name = serializers.CharField(source="inventoryid.outletid.name", read_only=True)

    class Meta:
        model = Inventoryitems
        fields = [
            "inventory_item_id",
            "product_id",
            "name",
            "image",
            "description",
            "category_name",
            "price",
            "quantity",
            "outlet_id",
            "outlet_name",
        ]

    def get_category_name(self, obj):
        if obj.itemid.categoryid:
            return obj.itemid.categoryid.name

        if obj.itemid.orgcategoryid and obj.itemid.orgcategoryid.categoryid:
            return obj.itemid.orgcategoryid.categoryid.name

        if obj.itemid.orgcategoryid:
            return obj.itemid.orgcategoryid.name

        return None


class SearchStoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Outlet
        fields = ["id", "name", "address", "phone"]


class SearchCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Itemcategory
        fields = ["id", "name", "description"]


class SearchOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name"]


class SearchBranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ["id", "name", "address", "phone"]


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            'id',
            'title',
            'message',
            'type',
            'isread',
            'createdat',
        ]



class OrgItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Orgitemcategory
        fields = '__all__'
