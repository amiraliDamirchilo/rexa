from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse

from .models import ContactMessage, SiteContent, WorkProject, get_youtube_video_id


class PortfolioTests(TestCase):
    def test_homepage_renders(self):
        response = self.client.get(reverse("portfolio:home"))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "TURNING")
        self.assertContains(response, "BOOK")

    def test_youtube_work_project_renders(self):
        WorkProject.objects.create(
            title="A Real Film",
            description="A short-form editing project.",
            youtube_url="https://youtube.com/shorts/GC-RhAd2zfw?si=test",
        )
        response = self.client.get(reverse("portfolio:home"))
        self.assertContains(response, "A REAL FILM")
        self.assertContains(response, "A short-form editing project.")
        self.assertContains(
            response,
            "https://www.youtube-nocookie.com/embed/GC-RhAd2zfw?playsinline=1&amp;rel=0",
        )
        self.assertContains(response, "<iframe", html=False)
        self.assertNotContains(response, "<video", html=False)
        self.assertNotContains(response, "WATCH ON YOUTUBE")

    def test_site_content_can_change_homepage_copy(self):
        content = SiteContent.load()
        content.hero_line_1 = "CUSTOM HEADLINE"
        content.form_submit_label = "SEND THE BRIEF"
        content.save()

        response = self.client.get(reverse("portfolio:home"))
        self.assertContains(response, "CUSTOM HEADLINE")
        self.assertContains(response, "SEND THE BRIEF")

    def test_contact_form_only_has_requested_fields(self):
        response = self.client.get(reverse("portfolio:home"))
        self.assertContains(response, 'name="name"', html=False)
        self.assertContains(response, 'name="email"', html=False)
        self.assertContains(response, 'name="message"', html=False)
        self.assertNotContains(response, 'name="project_type"', html=False)
        self.assertNotContains(response, 'name="budget"', html=False)

    def test_supported_youtube_urls_extract_video_id(self):
        urls = (
            "https://youtube.com/shorts/GC-RhAd2zfw?si=test",
            "https://www.youtube.com/watch?v=GC-RhAd2zfw",
            "https://youtu.be/GC-RhAd2zfw",
            "https://www.youtube.com/embed/GC-RhAd2zfw",
        )
        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(get_youtube_video_id(url), "GC-RhAd2zfw")

    def test_non_youtube_url_is_rejected(self):
        project = WorkProject(
            title="Invalid",
            description="This URL must not pass validation.",
            youtube_url="https://example.com/watch?v=GC-RhAd2zfw",
        )
        with self.assertRaises(ValidationError):
            project.full_clean()

    def test_contact_submission_is_saved(self):
        response = self.client.post(
            reverse("portfolio:contact"),
            {
                "name": "Test Client",
                "email": "client@example.com",
                "message": "A documentary edit with a four-week deadline.",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["ok"])
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_contact_validation(self):
        response = self.client.post(
            reverse("portfolio:contact"),
            {
                "name": "Test Client",
                "email": "not-an-email",
                "message": "A valid-length message.",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])
        self.assertEqual(ContactMessage.objects.count(), 0)
