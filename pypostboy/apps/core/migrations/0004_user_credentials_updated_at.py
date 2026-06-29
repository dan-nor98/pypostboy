from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0003_alter_user_managers_user_groups_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='credentials_updated_at',
            field=models.TextField(null=True),
        ),
        migrations.RunSQL(
            "UPDATE users SET credentials_updated_at = COALESCE(updated_at, created_at) WHERE credentials_updated_at IS NULL",
            migrations.RunSQL.noop,
        ),
    ]
