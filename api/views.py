from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.conf import settings
from rest_framework.permissions import AllowAny
from django.db import transaction
from rest_framework.exceptions import ValidationError
from django.db.models import Count, Q
from django.utils.text import slugify

from .models import (
    User,
    DeliveryAddress,
    Inventoryitems,
    Itemcategory,
    Organization,
    Branch,
    Outlet,
    Cart,
    CartItem,
    Kompracorder,
    Item,
    Notification,
    Orgitemcategory,
    Courier,
)

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    DeliveryAddressSerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    CategorySerializer,
    OrganizationSerializer,
    BranchSerializer,
    OutletSerializer,
    CartSerializer,
    CartItemSerializer,
    KompracorderSerializer,
    CheckoutSerializer,
    SearchProductSerializer,
    SearchStoreSerializer,
    SearchCategorySerializer,
    SearchOrganizationSerializer,
    SearchBranchSerializer,
    NotificationSerializer,
    OrgItemCategorySerializer,
    CourierSerializer,

)


# --- AUTHENTICATION ---

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def perform_create(self, serializer):
        user = serializer.save()
        otp_code = user.generate_otp()

        print(f"--- DEBUG: OTP for {user.email} is {otp_code} ---")

        subject = "Verify your Kumpra.ph Account"
        message = f"Hello {user.full_name},\n\nYour verification code is: {otp_code}\n\nPlease enter this code to activate your account."

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False
            )
        except Exception as e:
            print(f"Email failed to send: {e}")


class ResendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        try:
            user = User.objects.get(email=email, is_verified=False)
            otp_code = user.generate_otp()

            send_mail(
                "Your New Kumpra.ph Verification Code",
                f"Your new code is: {otp_code}",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False
            )
            return Response({"message": "New OTP sent."}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found or already verified."}, status=status.HTTP_404_NOT_FOUND)


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        otp = request.data.get("otp")

        if not email or not otp:
            return Response({"error": "Email and OTP are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
            if user.otp == otp:
                user.is_verified = True
                user.otp = None
                user.save()
                return Response({
                    "message": "Email verified successfully.",
                    "is_verified": True
                }, status=status.HTTP_200_OK)
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        user = authenticate(email=email, password=password)

        if user:
            if not user.is_verified:
                return Response(
                    {"error": "Please verify your email first.", "needs_verification": True},
                    status=status.HTTP_403_FORBIDDEN
                )

            if user.role == "SELLER":
                if user.store_profile.status != "APPROVED":
                    return Response({
                        "error": f"Your store application is currently {user.store_profile.status.lower()}.",
                        "status": user.store_profile.status
                    }, status=status.HTTP_403_FORBIDDEN)

            elif user.role == "SUPPLIER":
                if user.supplier_profile.status != "APPROVED":
                    return Response({
                        "error": f"Your supplier application is currently {user.supplier_profile.status.lower()}.",
                        "status": user.supplier_profile.status
                    }, status=status.HTTP_403_FORBIDDEN)

            refresh = RefreshToken.for_user(user)
            return Response({
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }, status=status.HTTP_200_OK)

        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)



class UpdateProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    # ADD THIS: Handle fetching profile data
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        user = request.user
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# --- ADDRESS VIEWS ---

class DeliveryAddressListCreateView(generics.ListCreateAPIView):
    serializer_class = DeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DeliveryAddress.objects.filter(user=self.request.user).order_by("-is_default", "-created_at")

    def create(self, request, *args, **kwargs):
        print("ADDRESS POST DATA:", request.data)

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("ADDRESS SERIALIZER ERRORS:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DeliveryAddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DeliveryAddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DeliveryAddress.objects.filter(user=self.request.user)


# --- PRODUCT VIEWS ---

class ProductListView(generics.ListAPIView):
    serializer_class = ProductListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = (
            Inventoryitems.objects.select_related(
                "itemid",
                "itemid__categoryid",
                "itemid__orgcategoryid",
                "itemid__orgcategoryid__categoryid",
                "itemid__brandid",
                "inventoryid",
                "inventoryid__outletid",
                "inventoryid__outletid__branchid",
            )
            .filter(quantity__gt=0)
            .order_by("itemid__name")
        )

        category_id = self.request.query_params.get("category")
        outlet_id = self.request.query_params.get("outlet")
        search = (self.request.query_params.get("search") or "").strip()

        if category_id:
            queryset = queryset.filter(
                Q(itemid__categoryid_id=category_id) |
                Q(itemid__orgcategoryid__categoryid_id=category_id)
            )

        if outlet_id:
            queryset = queryset.filter(inventoryid__outletid_id=outlet_id)

        if search:
            queryset = queryset.filter(
                Q(itemid__name__icontains=search) |
                Q(itemid__description__icontains=search) |
                Q(itemid__categoryid__name__icontains=search) |
                Q(itemid__orgcategoryid__name__icontains=search) |
                Q(itemid__orgcategoryid__categoryid__name__icontains=search) |
                Q(inventoryid__outletid__name__icontains=search)
            )

        return queryset.distinct()

class ProductDetailView(generics.RetrieveAPIView):
    serializer_class = ProductDetailSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Inventoryitems.objects.select_related(
                "itemid",
                "itemid__categoryid",
                "itemid__orgcategoryid",
                "itemid__orgcategoryid__categoryid",
                "itemid__brandid",
                "inventoryid",
                "inventoryid__outletid",
                "inventoryid__outletid__branchid",
            )
            .filter(quantity__gt=0)
        )


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Itemcategory.objects.annotate(
                product_count=Count(
                    "items",
                    filter=Q(items__inventoryitems__quantity__gt=0),
                    distinct=True,
                )
            )
            .order_by("name")
        )


class OrganizationListView(generics.ListAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Organization.objects.all().order_by("name")


class OrganizationDetailView(generics.RetrieveAPIView):
    serializer_class = OrganizationSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Organization.objects.all()
    

class OrganizationBySlugView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        organizations = Organization.objects.all()

        for org in organizations:
            if slugify(org.name) == slug:
                serializer = OrganizationSerializer(org)
                return Response(serializer.data)

        return Response(
            {"error": "Organization not found"},
            status=status.HTTP_404_NOT_FOUND
        )


class BranchDetailView(generics.RetrieveAPIView):
    serializer_class = BranchSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Branch.objects.select_related("orgid").all()


class OutletListView(generics.ListAPIView):
    serializer_class = OutletSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Outlet.objects.select_related("orgid", "branchid").all().order_by("name")

        org_id = self.request.query_params.get("organization")
        branch_id = self.request.query_params.get("branch")

        if org_id:
            queryset = queryset.filter(orgid_id=org_id)

        if branch_id:
            queryset = queryset.filter(branchid_id=branch_id)

        return queryset


class OutletDetailView(generics.RetrieveAPIView):
    serializer_class = OutletSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Outlet.objects.select_related("orgid", "branchid").all()


# --- CART VIEWS ---

def get_cart_response(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    serializer = CartSerializer(cart)
    return serializer.data


class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(get_cart_response(request.user), status=status.HTTP_200_OK)


class AddToCartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        branch_id = request.data.get("branch_id")

        try:
            product_id = int(product_id)
        except (TypeError, ValueError):
            return Response({"error": "Valid product_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity = int(request.data.get("quantity", 1))
        except (TypeError, ValueError):
            return Response({"error": "Valid quantity is required."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            return Response({"error": "Quantity must be greater than 0."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            inventory_item = Inventoryitems.objects.select_related("itemid").get(id=product_id)
        except Inventoryitems.DoesNotExist:
            return Response(
                {"error": f"Product not found. Sent product_id={product_id}"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if inventory_item.quantity < quantity:
            return Response({"error": "Insufficient stock."}, status=status.HTTP_400_BAD_REQUEST)

        cart, _ = Cart.objects.get_or_create(user=request.user)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product_id=inventory_item.id,
            branch_id=branch_id,
            defaults={
                "quantity": quantity,
                "unit_price": inventory_item.price,
                "subtotal": inventory_item.price * quantity,
            }
        )

        if not created:
            new_quantity = cart_item.quantity + quantity

            if inventory_item.quantity < new_quantity:
                return Response({"error": "Insufficient stock."}, status=status.HTTP_400_BAD_REQUEST)

            cart_item.quantity = new_quantity
            cart_item.unit_price = inventory_item.price
            cart_item.subtotal = inventory_item.price * new_quantity
            cart_item.save()

        return Response(get_cart_response(request.user), status=status.HTTP_201_CREATED)


class UpdateCartItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            cart = Cart.objects.get(user=request.user)
            cart_item = CartItem.objects.get(id=pk, cart=cart)
        except Cart.DoesNotExist:
            return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        quantity = request.data.get("quantity")
        if quantity is None:
            return Response({"error": "quantity is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response({"error": "Valid quantity is required."}, status=status.HTTP_400_BAD_REQUEST)

        if quantity <= 0:
            cart_item.delete()
            return Response(get_cart_response(request.user), status=status.HTTP_200_OK)

        try:
            inventory_item = Inventoryitems.objects.get(id=cart_item.product_id)
        except Inventoryitems.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        if inventory_item.quantity < quantity:
            return Response({"error": "Insufficient stock."}, status=status.HTTP_400_BAD_REQUEST)

        cart_item.quantity = quantity
        cart_item.unit_price = inventory_item.price
        cart_item.subtotal = inventory_item.price * quantity
        cart_item.save()

        return Response(get_cart_response(request.user), status=status.HTTP_200_OK)


class RemoveCartItemView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        try:
            cart = Cart.objects.get(user=request.user)
            cart_item = CartItem.objects.get(id=pk, cart=cart)
        except Cart.DoesNotExist:
            return Response({"error": "Cart not found."}, status=status.HTTP_404_NOT_FOUND)
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found."}, status=status.HTTP_404_NOT_FOUND)

        cart_item.delete()
        return Response(get_cart_response(request.user), status=status.HTTP_200_OK)


# --- CHECKOUT VIEW ---

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        try:
            print("CHECKOUT REQUEST DATA:", request.data)

            serializer = CheckoutSerializer(
                data=request.data,
                context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            print("COURIER IDS RECEIVED:", request.data.get("courier_ids"))
            order = serializer.save()

            print("CHECKOUT ORDER CREATED:", order.id, order.transactionnumber)

            return Response(KompracorderSerializer(order).data, status=status.HTTP_201_CREATED)

        except ValidationError as e:
            print("CHECKOUT VALIDATION ERROR:", e.detail)
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            import traceback
            print("CHECKOUT ERROR:", str(e))
            traceback.print_exc()
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# --- ORDER VIEWS ---

class OrderListView(generics.ListAPIView):
    serializer_class = KompracorderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Kompracorder.objects.prefetch_related(
            "ordercourierpreference_set__courier"
        ).filter(
            customerid__email=self.request.user.email
        ).order_by("-createdat")


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = KompracorderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Kompracorder.objects.prefetch_related(
            "ordercourierpreference_set__courier"
        ).filter(
            customerid__email=self.request.user.email
        )
    

class CourierListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Courier.objects.all()
    serializer_class = CourierSerializer
            

class CancelOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, pk):
        try:
            order = Kompracorder.objects.get(
                id=pk,
                customerid__email=request.user.email
            )

            # ❗ Only allow cancel if still pending
            if order.status.lower() not in ["pending", "confirmed"]:
                return Response(
                    {"error": "Order cannot be cancelled."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if order.status.lower() == "cancelled":
                return Response(
                    {"error": "Order already cancelled."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # ✅ RESTORE STOCK HERE
            for item in order.kompracorderitem_set.all():
                inventory_item = item.inventoryitemid
                inventory_item.quantity += item.quantity
                inventory_item.save()
               

            # ✅ UPDATE STATUS
            order.status = "cancelled"
            order.save()

            return Response({"message": "Order cancelled successfully."})

        except Kompracorder.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        
    

class GlobalSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()

        if not query:
            return Response({
                "products": [],
                "stores": [],
                "categories": [],
                "organizations": [],
                "branches": [],
            })

        products = (
            Inventoryitems.objects.select_related(
                "itemid",
                "itemid__categoryid",
                "itemid__orgcategoryid",
                "itemid__orgcategoryid__categoryid",
                "inventoryid",
                "inventoryid__outletid",
            )
            .filter(quantity__gt=0)
            .filter(
                Q(itemid__name__icontains=query) |
                Q(itemid__description__icontains=query) |
                Q(itemid__categoryid__name__icontains=query) |
                Q(itemid__orgcategoryid__name__icontains=query) |
                Q(itemid__orgcategoryid__categoryid__name__icontains=query) |
                Q(inventoryid__outletid__name__icontains=query)
            )
            .distinct()
            .order_by("itemid__name")[:12]
        )

        stores = Outlet.objects.filter(
            Q(name__icontains=query) |
            Q(address__icontains=query) |
            Q(phone__icontains=query)
        ).order_by("name")[:8]

        categories = Itemcategory.objects.filter(
            Q(name__icontains=query) |
            Q(description__icontains=query)
        ).order_by("name")[:8]

        organizations = Organization.objects.filter(
            name__icontains=query
        ).order_by("name")[:8]

        branches = Branch.objects.filter(
            Q(name__icontains=query) |
            Q(address__icontains=query) |
            Q(phone__icontains=query)
        ).order_by("name")[:8]

        return Response({
            "products": SearchProductSerializer(products, many=True).data,
            "stores": SearchStoreSerializer(stores, many=True).data,
            "categories": SearchCategorySerializer(categories, many=True).data,
            "organizations": SearchOrganizationSerializer(organizations, many=True).data,
            "branches": SearchBranchSerializer(branches, many=True).data,
        })
    


class NotificationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        org_id = request.query_params.get("orgId")

        if not org_id:
            return Response({"error": "orgId is required"}, status=400)

        notifications = Notification.objects.filter(
            orgid_id=org_id
        ).order_by('-createdat')

        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)


class MarkAllReadView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        org_id = request.data.get("orgId")

        if not org_id:
            return Response({"error": "orgId is required"}, status=400)

        Notification.objects.filter(
            orgid_id=org_id,
            isread=False
        ).update(isread=True)

        return Response({"message": "All notifications marked as read"})
    

class NotificationDeleteView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk)
            notification.delete()
            return Response({"message": "Deleted successfully"})
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found"}, status=404)
    

class OrgItemCategoryListView(generics.ListAPIView):
    serializer_class = OrgItemCategorySerializer
    permission_classes = [AllowAny] 

    def get_queryset(self):
        org_id = self.kwargs['org_id']
        return Orgitemcategory.objects.filter(orgid=org_id, isactive=True)


class OrganizationSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, org_id):
        query = (request.query_params.get("q") or "").strip()

        if not query:
            return Response({
                "products": [],
                "stores": [],
                "branches": [],
            })

        # ✅ PRODUCTS (simplified + reliable)
        products = Inventoryitems.objects.select_related(
            "itemid",
            "inventoryid",
            "inventoryid__outletid",
            "inventoryid__outletid__branchid",
        ).filter(
            inventoryid__outletid__orgid_id=org_id
        ).filter(
            Q(itemid__name__icontains=query) |
            Q(itemid__description__icontains=query)
        ).distinct()

        # ✅ STORES / OUTLETS
        stores = Outlet.objects.filter(
            orgid_id=org_id
        ).filter(
            Q(name__icontains=query) |
            Q(address__icontains=query)
        )

        # ✅ BRANCHES
        branches = Branch.objects.filter(
            orgid_id=org_id
        ).filter(
            Q(name__icontains=query) |
            Q(address__icontains=query)
        )

        return Response({
            "products": SearchProductSerializer(products, many=True).data,
            "stores": SearchStoreSerializer(stores, many=True).data,
            "branches": SearchBranchSerializer(branches, many=True).data,
        })