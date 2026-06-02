from django.urls import path
from .views import (
    RegisterView,
    ResendOTPView,
    VerifyEmailView,
    LoginView,
    DeliveryAddressListCreateView,
    DeliveryAddressDetailView,
    ProductListView,
    ProductDetailView,
    CategoryListView,
    OrganizationListView,
    OrganizationDetailView,
    BranchDetailView,
    OutletListView,
    OutletDetailView,
    CartView,
    AddToCartView,
    UpdateCartItemView,
    RemoveCartItemView,
    CheckoutView,
    OrderListView,
    OrderDetailView,
    GlobalSearchView,
    UpdateProfileView,
    CancelOrderView,
    NotificationListView,
    OrgItemCategoryListView,
    OrganizationBySlugView,
    CourierListView,
    OrganizationSearchView,
    MarkAllReadView,
    NotificationDeleteView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("resend-otp/", ResendOTPView.as_view(), name="resend-otp"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("login/", LoginView.as_view(), name="login"),

    path("addresses/", DeliveryAddressListCreateView.as_view(), name="address-list-create"),
    path("addresses/<int:pk>/", DeliveryAddressDetailView.as_view(), name="address-detail"),

    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<int:pk>/", ProductDetailView.as_view(), name="product-detail"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("search/", GlobalSearchView.as_view(), name="global-search"),

    path("organizations/", OrganizationListView.as_view(), name="organization-list"),
    path("organizations/<int:pk>/", OrganizationDetailView.as_view(), name="organization-detail"),
    path("branches/<int:pk>/", BranchDetailView.as_view(), name="branch-detail"),

    path("outlets/", OutletListView.as_view(), name="outlet-list"),
    path("outlets/<int:pk>/", OutletDetailView.as_view(), name="outlet-detail"),

    path("cart/", CartView.as_view(), name="cart"),
    path("cart/add/", AddToCartView.as_view(), name="cart-add"),
    path("cart/item/<int:pk>/", UpdateCartItemView.as_view(), name="cart-item-update"),
    path("cart/item/<int:pk>/delete/", RemoveCartItemView.as_view(), name="cart-item-delete"),

    path("checkout/", CheckoutView.as_view(), name="checkout"),

    path("orders/", OrderListView.as_view(), name="order-list"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:pk>/cancel/", CancelOrderView.as_view()),

    path("user/update-profile/", UpdateProfileView.as_view(), name="update-profile"),

    path('notifications/', NotificationListView.as_view()),
    path('notifications/mark-all-read/', MarkAllReadView.as_view()),
    path('notifications/<int:pk>/', NotificationDeleteView.as_view()),

    path('org-item-categories/<int:org_id>/', OrgItemCategoryListView.as_view()),

    path("organizations/slug/<slug:slug>/", OrganizationBySlugView.as_view()),

    path("couriers/", CourierListView.as_view()),

    path('organization/<int:org_id>/search/', OrganizationSearchView.as_view()),

]