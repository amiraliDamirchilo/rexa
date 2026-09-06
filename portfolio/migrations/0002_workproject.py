import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("portfolio", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="WorkProject",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=140)),
                ("category", models.CharField(help_text="Example: EDITING · SOUND DESIGN · TITLES", max_length=160)),
                ("year", models.PositiveSmallIntegerField(default=2026)),
                ("video", models.FileField(help_text="Upload an MP4, WebM, or OGG video.", upload_to="portfolio/videos/", validators=[django.core.validators.FileExtensionValidator(["mp4", "webm", "ogg"])])),
                ("poster", models.FileField(blank=True, help_text="Optional cover image shown before playback.", upload_to="portfolio/posters/", validators=[django.core.validators.FileExtensionValidator(["jpg", "jpeg", "png", "webp"])])),
                ("order", models.PositiveSmallIntegerField(default=0)),
                ("is_published", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["order", "-year", "-created_at"]},
        ),
    ]
