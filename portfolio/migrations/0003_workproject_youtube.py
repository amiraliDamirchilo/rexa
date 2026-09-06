from django.db import migrations, models

import portfolio.models


PROJECTS = (
    {
        "title": "September 4, 2026",
        "description": "A short-form editing piece created for fast, engaging social viewing.",
        "youtube_url": "https://youtube.com/shorts/GC-RhAd2zfw?si=zFBSaLKgqpc0j4p_",
    },
    {
        "title": "September 4, 2026",
        "description": "A vertical edit focused on pacing, motion, and viewer retention.",
        "youtube_url": "https://youtube.com/shorts/3ooOFReaiSE?si=-2hoR8owV0M75KLY",
    },
    {
        "title": "September 5, 2026",
        "description": "A short-form project combining clean cuts with a bold visual rhythm.",
        "youtube_url": "https://youtube.com/shorts/P_qGB0aUAuI?si=LE2FUnEZ7DLx9ZQx",
    },
    {
        "title": "September 5, 2026",
        "description": "A vertical storytelling edit designed to capture attention quickly.",
        "youtube_url": "https://youtube.com/shorts/ngBWleD6ihk?si=ka7TSHTFMA9N_3Hl",
    },
)


def seed_youtube_projects(apps, schema_editor):
    WorkProject = apps.get_model("portfolio", "WorkProject")
    WorkProject.objects.all().delete()
    WorkProject.objects.bulk_create(WorkProject(**project) for project in PROJECTS)


def clear_youtube_projects(apps, schema_editor):
    WorkProject = apps.get_model("portfolio", "WorkProject")
    WorkProject.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [("portfolio", "0002_workproject")]

    operations = [
        migrations.AddField(
            model_name="workproject",
            name="description",
            field=models.TextField(
                blank=True,
                default="",
                help_text="A short description shown below the video.",
                max_length=360,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="workproject",
            name="youtube_url",
            field=models.URLField(default="", max_length=500),
            preserve_default=False,
        ),
        migrations.RemoveField(model_name="workproject", name="category"),
        migrations.RemoveField(model_name="workproject", name="is_published"),
        migrations.RemoveField(model_name="workproject", name="order"),
        migrations.RemoveField(model_name="workproject", name="poster"),
        migrations.RemoveField(model_name="workproject", name="video"),
        migrations.RemoveField(model_name="workproject", name="year"),
        migrations.AlterModelOptions(
            name="workproject",
            options={"ordering": ["created_at", "id"]},
        ),
        migrations.RunPython(seed_youtube_projects, clear_youtube_projects),
        migrations.AlterField(
            model_name="workproject",
            name="youtube_url",
            field=models.URLField(
                help_text="Paste a YouTube video or Shorts link.",
                max_length=500,
                validators=[portfolio.models.validate_youtube_url],
            ),
        ),
    ]
