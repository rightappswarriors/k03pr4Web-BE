from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),  # adjust if needed
    ]

    operations = [
        migrations.CreateModel(
            name='DeliveryAddress',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('full_name', models.CharField(max_length=255)),
                ('phone', models.CharField(max_length=20)),
                ('region', models.CharField(max_length=100)),
                ('province', models.CharField(max_length=100)),
                ('city', models.CharField(max_length=100)),
                ('barangay', models.CharField(max_length=100)),
                ('street_address', models.CharField(max_length=255)),
                ('postal_code', models.CharField(max_length=10)),
                ('label', models.CharField(default='Home', max_length=20)),
                ('is_default', models.BooleanField(default=False)),
                ('lat', models.DecimalField(max_digits=12, decimal_places=9)),
                ('lng', models.DecimalField(max_digits=12, decimal_places=9)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='addresses',
                    to=settings.AUTH_USER_MODEL
                )),
            ],
        ),
    ]