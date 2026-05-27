from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('username', models.TextField(unique=True)),
                ('email', models.TextField(null=True, unique=True)),
                ('password', models.TextField(db_column='password_hash', null=True)),
                ('auth_provider', models.TextField(default='local')),
                ('auth_subject', models.TextField(null=True)),
                ('recovery_key_hash', models.TextField(null=True)),
                ('recovery_key_created_at', models.TextField(null=True)),
                ('recovery_key_rotated_at', models.TextField(null=True)),
                ('created_at', models.TextField()),
                ('last_login', models.DateTimeField(blank=True, null=True)),
                ('is_superuser', models.BooleanField(default=False)),
                ('is_staff', models.BooleanField(default=False)),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.TextField()),
            ],
            options={'db_table': 'users', 'managed': False},
        ),
        migrations.CreateModel(
            name='Collection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('description', models.TextField(default='')),
                ('sort_order', models.IntegerField(default=0)),
                ('created_at', models.TextField()),
                ('updated_at', models.TextField()),
            ],
            options={'db_table': 'collections', 'managed': False},
        ),
        migrations.CreateModel(
            name='Request',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),('method', models.TextField(default='GET')),('url', models.TextField(default='')),
                ('headers', models.TextField(default='[]')),('body_type', models.TextField(default='none')),
                ('body_content', models.TextField(default='')),('body_raw_type', models.TextField(default='application/json')),
                ('form_data', models.TextField(default='[]')),('auth_type', models.TextField(default='none')),
                ('auth_data', models.TextField(default='{}')),('sort_order', models.IntegerField(default=0)),
                ('created_at', models.TextField()),('updated_at', models.TextField()),
            ],
            options={'db_table': 'requests', 'managed': False},
        ),
        migrations.CreateModel(
            name='RequestInstance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),('method', models.TextField(default='GET')),('url', models.TextField(default='')),
                ('headers', models.TextField(default='[]')),('body_type', models.TextField(default='none')),
                ('body_content', models.TextField(default='')),('body_raw_type', models.TextField(default='application/json')),
                ('form_data', models.TextField(default='[]')),('auth_type', models.TextField(default='none')),
                ('auth_data', models.TextField(default='{}')),('response_status', models.IntegerField(null=True)),
                ('response_status_text', models.TextField(default='')),('response_headers', models.TextField(default='{}')),
                ('response_body', models.TextField(null=True)),('response_time_ms', models.IntegerField(null=True)),
                ('response_size', models.TextField(default='')),('created_at', models.TextField()),('updated_at', models.TextField()),
            ],
            options={'db_table': 'request_instances', 'managed': False},
        ),
    ]
