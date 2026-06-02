import random
import os
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone

# --- DYNAMIC UPLOAD PATHS ---

def supplier_doc_path(instance, filename):
    # Organizes files into media/suppliers/CompanyName/filename
    return f"suppliers/{instance.company_name.replace(' ', '_')}/{filename}"

def seller_doc_path(instance, filename):
    # Organizes files into media/sellers/StoreName/filename
    return f"sellers/{instance.store_name.replace(' ', '_')}/{filename}"


# --- USER MANAGER ---

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        
        extra_fields.setdefault("is_verified", False)
        
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_verified", True)
        # Superusers are Admins by default
        extra_fields.setdefault("role", "ADMIN")
        
        return self.create_user(email, password, **extra_fields)


# --- CUSTOM USER MODEL ---

class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    contact_number = models.CharField(max_length=11)

    profile_image = models.ImageField(upload_to='profile_pics/', null=True, blank=True)

    # Multi-Role Logic
    ROLE_CHOICES = [
        ("CUSTOMER", "Customer"),
        ("SELLER", "Store Seller"),
        ("SUPPLIER", "Supplier"),
        ("ADMIN", "Admin"),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="CUSTOMER")

    GENDER_CHOICES = [
        ("Male", "Male"),
        ("Female", "Female"),
        ("Other", "Other"),
    ]
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    is_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "contact_number"]

    objects = UserManager()

    def __str__(self):
        return f"{self.email} ({self.role})"

    def generate_otp(self):
        code = str(random.randint(100000, 999999))
        self.otp = code
        self.save()
        return code


# --- STORE / SELLER MODEL ---

class Store(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending Review"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="store_profile")
    store_name = models.CharField(max_length=255)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    # Business Location
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=10)
    
    # Verification Documents
    business_permit = models.FileField(upload_to=seller_doc_path)
    dti_sec_registration = models.FileField(upload_to=seller_doc_path)
    
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.store_name


# --- SUPPLIER MODEL ---

class Supplier(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending Review"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="supplier_profile")
    company_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=100) 
    product_category = models.CharField(max_length=100)
    
    # Logistics Info
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=10)
    min_order_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    delivery_areas = models.TextField() 

    # Verification Documents
    registration_cert = models.FileField(upload_to=supplier_doc_path)
    bir_2303 = models.FileField(upload_to=supplier_doc_path)
    catalog = models.FileField(upload_to=supplier_doc_path, blank=True, null=True)

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="PENDING")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.company_name


# --- DELIVERY ADDRESS MODEL ---

class DeliveryAddress(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="addresses"
    )
    
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    
    region = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    barangay = models.CharField(max_length=100)
    
    street_address = models.CharField(max_length=255)
    postal_code = models.CharField(max_length=10)
    label = models.CharField(max_length=20, default="Home")
    is_default = models.BooleanField(default=False)
    
    lat = models.DecimalField(max_digits=12, decimal_places=9)
    lng = models.DecimalField(max_digits=12, decimal_places=9)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Delivery Address"
        verbose_name_plural = "Delivery Addresses"

    def save(self, *args, **kwargs):
        if self.is_default:
            DeliveryAddress.objects.filter(user=self.user).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.label} - {self.full_name} ({self.city})"


class PosDeliveryAddress(models.Model):
    customerid = models.ForeignKey('Kompracustomer', models.DO_NOTHING, db_column='customerId')
    label = models.TextField()
    address = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    isdefault = models.BooleanField(db_column='isDefault')
    createdat = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = 'DeliveryAddress'



class Brand(models.Model):
    name = models.TextField(unique=True)

    class Meta:
        managed = False
        db_table = 'Brand'


class Itemcategory(models.Model):
    name = models.TextField(unique=True)
    description = models.TextField(blank=True, null=True)
    grouptype = models.TextField(db_column='groupType', blank=True, null=True)
    sales = models.TextField(blank=True, null=True)
    stocks = models.TextField(blank=True, null=True)
    createdat = models.DateTimeField(db_column='createdAt')
    icon = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ItemCategory'


class Item(models.Model):
    name = models.TextField(unique=True)
    image = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    barcode = models.TextField()
    brand = models.TextField(blank=True, null=True)
    orgid = models.ForeignKey('Organization', models.DO_NOTHING, db_column='orgId')
    categoryid = models.ForeignKey(
        'Itemcategory',
        models.DO_NOTHING,
        db_column='categoryId',
        blank=True,
        null=True,
        related_name='items'
    )
    brandid = models.ForeignKey(Brand, models.DO_NOTHING, db_column='brandId', blank=True, null=True)
    servicecharge = models.BooleanField(db_column='ServiceCharge')
    assembly = models.BooleanField()
    itemcode = models.TextField(db_column='itemCode', blank=True, null=True)
    skunumber = models.TextField(db_column='skuNumber', blank=True, null=True)
    vatexempt = models.BooleanField(db_column='vatExempt', blank=True, null=True)
    stock = models.FloatField()
    sellingprice = models.FloatField(db_column='sellingPrice')
    minquantity = models.FloatField(db_column='minQuantity')
    opexpct = models.FloatField(db_column='opExPct')
    priceb = models.FloatField(db_column='priceB', blank=True, null=True)
    pricec = models.FloatField(db_column='priceC', blank=True, null=True)
    totalcost = models.FloatField(db_column='totalCost')
    expiryenddate = models.DateTimeField(db_column='expiryEndDate', blank=True, null=True)
    expirystartdate = models.DateTimeField(db_column='expiryStartDate', blank=True, null=True)
    exactexpirydate = models.DateTimeField(db_column='exactExpiryDate', blank=True, null=True)
    orgcategoryid = models.ForeignKey('Orgitemcategory', models.DO_NOTHING, db_column='orgCategoryId', blank=True, null=True)
    vattypeid = models.ForeignKey('Vattype', models.DO_NOTHING, db_column='vatTypeId', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Item'
        unique_together = (('orgid', 'name'),)


class Itemgroup(models.Model):
    name = models.TextField()
    description = models.TextField(blank=True, null=True)
    icon = models.TextField(blank=True, null=True)
    isactive = models.BooleanField(db_column='isActive')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    orgid = models.ForeignKey('Organization', models.DO_NOTHING, db_column='orgId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'ItemGroup'
        unique_together = (('orgid', 'name'),)


class Itemunit(models.Model):
    unitname = models.TextField(db_column='unitName', unique=True)  # Field name made lowercase.
    description = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ItemUnit'


class Inventory(models.Model):
    name = models.TextField(blank=True, null=True)
    outletid = models.OneToOneField('Outlet', models.DO_NOTHING, db_column='outletId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Inventory'


class Inventoryitem(models.Model):
    id = models.TextField(primary_key=True)
    name = models.TextField()
    sku = models.TextField()
    stock = models.IntegerField()
    minstock = models.IntegerField(db_column='minStock')  # Field name made lowercase.
    category = models.TextField()
    price = models.FloatField()
    lowstock = models.BooleanField(db_column='lowStock')  # Field name made lowercase.
    orgid = models.ForeignKey('Organization', models.DO_NOTHING, db_column='orgId')  # Field name made lowercase.
    userid = models.ForeignKey('User', models.DO_NOTHING, db_column='userId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'InventoryItem'


class Inventoryitemunit(models.Model):
    inventoryitemid = models.ForeignKey('Inventoryitems', models.DO_NOTHING, db_column='inventoryItemId')  # Field name made lowercase.
    unitname = models.TextField(db_column='unitName')  # Field name made lowercase.
    unitlabel = models.TextField(db_column='unitLabel')  # Field name made lowercase.
    price = models.FloatField()
    quantity = models.FloatField()
    conversionfactor = models.FloatField(db_column='conversionFactor')  # Field name made lowercase.
    baseunit = models.TextField(db_column='baseUnit')  # Field name made lowercase.
    barcode = models.TextField(blank=True, null=True)
    isdefault = models.BooleanField(db_column='isDefault')  # Field name made lowercase.
    isactive = models.BooleanField(db_column='isActive')  # Field name made lowercase.
    minorderqty = models.FloatField(db_column='minOrderQty', blank=True, null=True)  # Field name made lowercase.
    maxorderqty = models.FloatField(db_column='maxOrderQty', blank=True, null=True)  # Field name made lowercase.
    reorderpoint = models.FloatField(db_column='reorderPoint', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'InventoryItemUnit'
        unique_together = (('inventoryitemid', 'unitname'),)



class Inventoryitems(models.Model):
    inventoryid = models.ForeignKey(Inventory, models.DO_NOTHING, db_column='inventoryId')  # Field name made lowercase.
    itemid = models.ForeignKey('Item', models.DO_NOTHING, db_column='itemId')  # Field name made lowercase.
    price = models.FloatField()
    quantity = models.IntegerField()
    locationid = models.OneToOneField('Location', models.DO_NOTHING, db_column='locationId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'InventoryItems'
        unique_together = (('inventoryid', 'itemid'),)


class Orgitemcategory(models.Model):
    orgid = models.ForeignKey('Organization', models.DO_NOTHING, db_column='orgId')  # Field name made lowercase.
    categoryid = models.ForeignKey(Itemcategory, models.DO_NOTHING, db_column='categoryId', blank=True, null=True)  # Field name made lowercase.
    name = models.TextField()
    description = models.TextField(blank=True, null=True)
    icon = models.TextField(blank=True, null=True)
    cost_of_sale = models.TextField(blank=True, null=True)
    grouptype = models.TextField(db_column='groupType', blank=True, null=True)  # Field name made lowercase.
    sales = models.TextField(blank=True, null=True)
    stocks = models.TextField(blank=True, null=True)
    groupid = models.ForeignKey(Itemgroup, models.DO_NOTHING, db_column='groupId', blank=True, null=True)  # Field name made lowercase.
    isactive = models.BooleanField(db_column='isActive')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'OrgItemCategory'
        unique_together = (('orgid', 'name'),)


class Location(models.Model):
    aisle = models.TextField(blank=True, null=True)
    rack = models.TextField(blank=True, null=True)
    shelf = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Location'


class Vattype(models.Model):
    orgid = models.ForeignKey('Organization', models.DO_NOTHING, db_column='orgId')  # Field name made lowercase.
    name = models.TextField()
    rate = models.FloatField()

    class Meta:
        managed = False
        db_table = 'VatType'
        unique_together = (('orgid', 'name'),)


class Media(models.Model):
    url = models.TextField()
    type = models.TextField(blank=True, null=True)  # This field type is a guess.
    itemid = models.ForeignKey(Item, models.DO_NOTHING, db_column='itemId', blank=True, null=True)  # Field name made lowercase.
    sortorder = models.IntegerField(db_column='sortOrder')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Media'



class Organization(models.Model):
    name = models.TextField()
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    bannerimg = models.TextField(db_column='bannerImg', blank=True, null=True)  # Field name made lowercase.
    contactnumber = models.TextField(db_column='contactNumber', blank=True, null=True)  # Field name made lowercase.
    email = models.TextField(blank=True, null=True)
    location = models.TextField(blank=True, null=True)
    profilephoto = models.TextField(db_column='profilePhoto', blank=True, null=True)  # Field name made lowercase.
    facebooklink = models.TextField(db_column='facebookLink', blank=True, null=True)  # Field name made lowercase.
    instagramlink = models.TextField(db_column='instagramLink', blank=True, null=True)  # Field name made lowercase.
    twitterlink = models.TextField(db_column='twitterLink', blank=True, null=True)  # Field name made lowercase.
    bio = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'Organization'


class Branch(models.Model):
    name = models.TextField()
    address = models.TextField()
    phone = models.TextField(blank=True, null=True)
    isactive = models.BooleanField(db_column='isActive')  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.      
    orgid = models.ForeignKey('Organization', models.DO_NOTHING, db_column='orgId')  # Field name made lowercase.
    ownerid = models.ForeignKey('User', models.DO_NOTHING, db_column='ownerId')  # Field name made lowercase.
    locationid = models.IntegerField(db_column='locationId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Branch'
        unique_together = (('orgid', 'name'),)



class Outlet(models.Model):
    name = models.TextField()
    address = models.TextField()
    phone = models.TextField(blank=True, null=True)
    code = models.TextField(unique=True)
    nexttransactionnumber = models.IntegerField(db_column='nextTransactionNumber', blank=True, null=True)  # Field name made lowercase.
    governmenttax = models.FloatField(db_column='governmentTax', blank=True, null=True)  # Field name made lowercase.
    servicecharge = models.FloatField(db_column='serviceCharge', blank=True, null=True)  # Field name made lowercase.
    outlettype = models.TextField(db_column='outletType')  # Field name made lowercase. This field type is a guess.
    isactive = models.BooleanField(db_column='isActive')  # Field name made lowercase.
    wifissid = models.TextField(db_column='wifiSSID', blank=True, null=True)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.      
    orgid = models.ForeignKey('Organization', models.DO_NOTHING, db_column='orgId')  # Field name made lowercase.
    branchid = models.ForeignKey('Branch', models.DO_NOTHING, db_column='branchId', blank=True, null=True)  # Field name made lowercase.
    ownerid = models.ForeignKey('User', models.DO_NOTHING, db_column='ownerId')  # Field name made lowercase.
    apikeyid = models.ForeignKey('Paymongoapikeys', models.DO_NOTHING, db_column='apiKeyId', blank=True, null=True)  # Field name made lowercase.
    haskey = models.BooleanField(db_column='hasKey')  # Field name made lowercase.
    status = models.TextField()  # This field type is a guess.
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    bannerimage = models.TextField(db_column='bannerImage', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Outlet'
        unique_together = (('orgid', 'code'),)

class Paymongoapikeys(models.Model):
    public_key = models.TextField()
    secret_key = models.TextField()
    ownerid = models.OneToOneField('User', models.DO_NOTHING, db_column='ownerId')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'PaymongoAPIKeys'
        


class Cart(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="api_cart")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "api_cart"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product_id = models.IntegerField()
    branch_id = models.IntegerField(blank=True, null=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "api_cartitem"
        unique_together = (("cart", "product_id", "branch_id"),)


class Kompracustomer(models.Model):
    fullname = models.TextField()
    email = models.TextField(unique=True)
    passwordhash = models.TextField(db_column='passwordHash')
    profilephoto = models.TextField(db_column='profilePhoto', blank=True, null=True)
    isverified = models.BooleanField(db_column='isVerified')
    isactive = models.BooleanField(db_column='isActive')
    createdat = models.DateTimeField(db_column='createdAt')
    updatedat = models.DateTimeField(db_column='updatedAt')
    phone = models.TextField(unique=True, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'KompraCustomer'


class Kompracdeliverytracking(models.Model):
    orderid = models.ForeignKey('Kompracorder', models.DO_NOTHING, db_column='orderId')
    event = models.TextField()
    statusat = models.DateTimeField(db_column='statusAt')
    currentlat = models.FloatField(db_column='currentLat', blank=True, null=True)
    currentlng = models.FloatField(db_column='currentLng', blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    actortype = models.TextField(db_column='actorType')
    actorid = models.IntegerField(db_column='actorId', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'KompraCDeliveryTracking'


class Kompracorder(models.Model):
    transactionnumber = models.TextField(db_column='transactionNumber', unique=True)  # Field name made lowercase.
    customerid = models.ForeignKey('Kompracustomer', models.DO_NOTHING, db_column='customerId')  # Field name made lowercase.
    outletid = models.ForeignKey('Outlet', models.DO_NOTHING, db_column='outletId')  # Field name made lowercase.
    deliveryaddressid = models.ForeignKey(
        'PosDeliveryAddress',
        models.DO_NOTHING,
        db_column='deliveryAddressId'
    )
    subtotal = models.FloatField()
    total = models.FloatField()
    status = models.TextField()  # This field type is a guess.
    scheduleddeliveryat = models.DateTimeField(db_column='scheduledDeliveryAt', blank=True, null=True)  # Field name made lowercase.
    estimateddeliveryat = models.DateTimeField(db_column='estimatedDeliveryAt', blank=True, null=True)  # Field name made lowercase.
    deliveredat = models.DateTimeField(db_column='deliveredAt', blank=True, null=True)  # Field name made lowercase.
    paymentmethod = models.TextField(db_column='paymentMethod')  # Field name made lowercase. This field type is a guess.
    paymentstatus = models.TextField(db_column='paymentStatus')  # Field name made lowercase.
    paymentreference = models.TextField(db_column='paymentReference', blank=True, null=True)  # Field name made lowercase.
    ridername = models.TextField(db_column='riderName', blank=True, null=True)  # Field name made lowercase.
    riderphone = models.TextField(db_column='riderPhone', blank=True, null=True)  # Field name made lowercase.
    customernote = models.TextField(db_column='customerNote', blank=True, null=True)  # Field name made lowercase.
    outletnote = models.TextField(db_column='outletNote', blank=True, null=True)  # Field name made lowercase.
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.
    updatedat = models.DateTimeField(db_column='updatedAt')  # Field name made lowercase.
    courierid = models.ForeignKey('Courier', models.DO_NOTHING, db_column='courierId', blank=True, null=True)  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'KompraCOrder'


class Courier(models.Model):
    name = models.TextField()
    phone = models.TextField()
    createdat = models.DateTimeField(db_column='createdAt')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'Courier'

class OrderCourierPreference(models.Model):
    id = models.AutoField(primary_key=True)

    order = models.ForeignKey(
        'Kompracorder',
        models.DO_NOTHING,
        db_column='order_id'
    )

    courier = models.ForeignKey(
        'Courier',
        models.DO_NOTHING,
        db_column='courier_id'
    )

    class Meta:
        managed = False
        db_table = 'OrderCourierPreference'


class Kompracorderfee(models.Model):
    orderid = models.ForeignKey(Kompracorder, models.DO_NOTHING, db_column='orderId')
    type = models.TextField()
    label = models.TextField()
    amount = models.FloatField()

    class Meta:
        managed = False
        db_table = 'KompraCOrderFee'


class Kompracorderitem(models.Model):
    orderid = models.ForeignKey(Kompracorder, models.DO_NOTHING, db_column='orderId')
    inventoryitemid = models.ForeignKey(Inventoryitems, models.DO_NOTHING, db_column='inventoryItemId')
    itemid = models.ForeignKey(Item, models.DO_NOTHING, db_column='itemId')
    quantity = models.IntegerField()
    pricesnapshot = models.FloatField(db_column='priceSnapshot')
    subtotal = models.FloatField()
    unitid = models.ForeignKey(Inventoryitemunit, models.DO_NOTHING, db_column='unitId', blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'KompraCOrderItem'
        unique_together = (('orderid', 'inventoryitemid'),)


class Outletdeliveryconfig(models.Model):
    outletid = models.OneToOneField(Outlet, models.DO_NOTHING, db_column='outletId')  # Field name made lowercase.
    isdeliveryactive = models.BooleanField(db_column='isDeliveryActive')  # Field name made lowercase.
    deliveryradiuskm = models.FloatField(db_column='deliveryRadiusKm')  # Field name made lowercase.
    basedeliveryfee = models.FloatField(db_column='baseDeliveryFee')  # Field name made lowercase.
    feeperkm = models.FloatField(db_column='feePerKm')  # Field name made lowercase.
    minorderamount = models.FloatField(db_column='minOrderAmount', blank=True, null=True)  # Field name made lowercase.
    maxorderamount = models.FloatField(db_column='maxOrderAmount', blank=True, null=True)  # Field name made lowercase.
    avgprepmins = models.IntegerField(db_column='avgPrepMins')  # Field name made lowercase.

    class Meta:
        managed = False
        db_table = 'OutletDeliveryConfig'
    

class Notification(models.Model):
    id = models.AutoField(primary_key=True)

    orgid = models.ForeignKey(
        'Organization',
        models.DO_NOTHING,
        db_column='orgId',
        related_name='notifications'
    )

    outletid = models.ForeignKey(
        'Outlet',
        models.DO_NOTHING,
        db_column='outletId',
        blank=True,
        null=True
    )

    itemid = models.ForeignKey(
        'Item',
        models.DO_NOTHING,
        db_column='itemId',
        blank=True,
        null=True
    )

    type = models.CharField(max_length=50)  # better than TextField
    title = models.CharField(max_length=255)
    message = models.TextField()

    isread = models.BooleanField(
        db_column='isRead',
        default=False
    )

    createdat = models.DateTimeField(
        db_column='createdAt',
        default=timezone.now
    )

    class Meta:
        db_table = 'Notification'
        ordering = ['-createdat']

    def __str__(self):
        return f"{self.title} ({self.type})"














