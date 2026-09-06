import re
from urllib.parse import parse_qs, urlparse

from django.core.exceptions import ValidationError
from django.db import models


YOUTUBE_VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$")


def get_youtube_video_id(url):
    """Return the video ID from a supported YouTube URL, or None."""
    try:
        parsed_url = urlparse(url.strip())
    except (AttributeError, ValueError):
        return None

    hostname = (parsed_url.hostname or "").lower()
    path_parts = [part for part in parsed_url.path.split("/") if part]
    video_id = None

    if hostname == "youtu.be" and path_parts:
        video_id = path_parts[0]
    elif hostname == "youtube.com" or hostname.endswith(".youtube.com"):
        if len(path_parts) >= 2 and path_parts[0] in {"shorts", "embed", "live"}:
            video_id = path_parts[1]
        elif parsed_url.path.rstrip("/") == "/watch":
            video_id = parse_qs(parsed_url.query).get("v", [None])[0]

    if video_id and YOUTUBE_VIDEO_ID_PATTERN.fullmatch(video_id):
        return video_id
    return None


def validate_youtube_url(value):
    if not get_youtube_video_id(value):
        raise ValidationError(
            "Enter a valid YouTube video, Shorts, Live, or youtu.be URL."
        )


class WorkProject(models.Model):
    title = models.CharField(max_length=140)
    description = models.TextField(
        max_length=360,
        blank=True,
        help_text="A short description shown below the video.",
    )
    youtube_url = models.URLField(
        max_length=500,
        validators=[validate_youtube_url],
        help_text="Paste a YouTube video or Shorts link.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    @property
    def youtube_embed_url(self):
        video_id = get_youtube_video_id(self.youtube_url)
        if not video_id:
            return ""
        return (
            f"https://www.youtube-nocookie.com/embed/{video_id}"
            "?playsinline=1&rel=0"
        )

    def __str__(self):
        return self.title


class SiteContent(models.Model):
    page_title = models.CharField(
        "Browser title",
        max_length=180,
        default="VOX — Video Editor & Motion Designer",
    )
    meta_description = models.TextField(
        "Search description",
        max_length=320,
        default="VOX — video editor and motion designer turning information into attention.",
    )
    skip_link_label = models.CharField(max_length=80, default="Skip to content")
    brand_name = models.CharField(max_length=40, default="VOX")
    menu_open_label = models.CharField(max_length=40, default="MENU")
    menu_close_label = models.CharField(max_length=40, default="CLOSE")
    nav_work = models.CharField(max_length=40, default="WORK")
    nav_services = models.CharField(max_length=40, default="SERVICES")
    nav_about = models.CharField(max_length=40, default="ABOUT")
    nav_process = models.CharField(max_length=40, default="PROCESS")
    nav_contact = models.CharField(max_length=40, default="CONTACT")
    header_cta = models.CharField(max_length=60, default="LET'S TALK")

    hero_index = models.CharField(max_length=80, default="01 / EDITORIAL MOTION")
    hero_line_1 = models.CharField(max_length=80, default="TURNING")
    hero_line_2 = models.CharField(max_length=80, default="INFORMATION")
    hero_line_3 = models.CharField(max_length=80, default="INTO")
    hero_line_4 = models.CharField(max_length=80, default="ATTENTION")
    hero_intro = models.TextField(
        max_length=400,
        default="I create videos and motion design that make complex ideas clear, engaging, and impossible to ignore.",
    )
    hero_cta = models.CharField(max_length=60, default="VIEW MY WORK")
    hero_image_alt = models.CharField(
        max_length=180,
        default="Young video editor standing with folded arms",
    )
    hero_role = models.CharField(
        max_length=120,
        default="VIDEO EDITOR &\nMOTION DESIGNER",
    )
    hero_attention = models.CharField(max_length=60, default="ATTENTION")

    services_heading = models.TextField(
        max_length=320,
        default="I HELP BRANDS, CREATORS,\nAND COMPANIES TURN INFORMATION\nINTO CONTENT THAT",
    )
    services_highlight = models.CharField(max_length=100, default="GETS ATTENTION.")
    service_1_title = models.CharField(max_length=80, default="VIDEO EDITING")
    service_1_description = models.TextField(
        max_length=240,
        default="Clean cuts. Strong pacing.\nStories that flow.",
    )
    service_2_title = models.CharField(max_length=80, default="MOTION DESIGN")
    service_2_description = models.TextField(
        max_length=240,
        default="Bringing ideas to life\nwith purpose and style.",
    )
    service_3_title = models.CharField(max_length=80, default="STORYTELLING")
    service_3_description = models.TextField(
        max_length=240,
        default="Turning complex information\ninto clear, engaging stories.",
    )

    work_index = models.CharField(max_length=80, default="02 / SELECTED PROJECTS")
    work_title_1 = models.CharField(max_length=80, default="WORK THAT")
    work_title_2 = models.CharField(max_length=80, default="MAKES NOISE.")
    work_intro = models.TextField(
        max_length=400,
        default="A selection of editorial films, explainers, campaigns, and motion systems made to be watched—not skipped.",
    )
    work_format_label = models.CharField(max_length=80, default="SHORT FILM / 9:16")
    work_empty_message = models.CharField(
        max_length=160,
        default="New work is coming soon.",
    )

    process_marquee = models.CharField(
        max_length=240,
        default="PROCESS / PROCESS / PROCESS / PROCESS /",
    )
    process_index = models.CharField(max_length=80, default="03 / THE METHOD")
    process_title_1 = models.CharField(max_length=80, default="CHAOS IN.")
    process_title_2 = models.CharField(max_length=80, default="CLARITY OUT.")
    process_intro = models.TextField(
        max_length=400,
        default="Every good edit starts with one question: what does the audience need to feel next?",
    )
    process_1_title = models.CharField(max_length=80, default="DIG")
    process_1_description = models.TextField(
        max_length=320,
        default="I find the point, the tension, and the human truth inside the raw material.",
    )
    process_2_title = models.CharField(max_length=80, default="SHAPE")
    process_2_description = models.TextField(
        max_length=320,
        default="I build the structure, rhythm, and visual logic before polishing a single frame.",
    )
    process_3_title = models.CharField(max_length=80, default="MOVE")
    process_3_description = models.TextField(
        max_length=320,
        default="Typography, motion, sound, and pacing turn the idea into an experience.",
    )
    process_4_title = models.CharField(max_length=80, default="DELIVER")
    process_4_description = models.TextField(
        max_length=320,
        default="Every format is checked, finished, and ready to work wherever it lands.",
    )

    about_stamp = models.CharField(
        max_length=160,
        default="STORY FIRST\nEVERY FRAME\nSTORY FIRST",
    )
    about_index = models.CharField(max_length=80, default="04 / ABOUT THE EDITOR")
    about_title_1 = models.CharField(max_length=80, default="NOT JUST")
    about_title_2 = models.CharField(max_length=100, default="PRETTY FRAMES.")
    about_paragraph_1 = models.TextField(
        max_length=500,
        default="I’m a video editor and motion designer obsessed with the moment a complicated idea suddenly feels simple.",
    )
    about_paragraph_2 = models.TextField(
        max_length=500,
        default="My work blends documentary instinct, editorial discipline, and bold graphic systems—always in service of the story.",
    )
    stat_1_value = models.CharField(max_length=40, default="06+")
    stat_1_label = models.CharField(max_length=100, default="YEARS CUTTING STORIES")
    stat_2_value = models.CharField(max_length=40, default="120")
    stat_2_label = models.CharField(max_length=100, default="PROJECTS DELIVERED")
    stat_3_value = models.CharField(max_length=40, default="14M")
    stat_3_label = models.CharField(max_length=100, default="ORGANIC VIEWS")

    contact_index = models.CharField(max_length=80, default="05 / START A PROJECT")
    contact_title_1 = models.CharField(max_length=80, default="BOOK")
    contact_title_2 = models.CharField(max_length=80, default="A CALL.")
    contact_intro = models.TextField(
        max_length=320,
        default="Tell me about your project and I’ll get back to you within 24 hours.",
    )
    availability_text = models.CharField(
        max_length=120,
        default="CURRENTLY BOOKING / SEP—OCT",
    )
    form_eyebrow = models.CharField(max_length=100, default="PROJECT INTAKE / 2026")
    form_heading = models.CharField(
        max_length=160,
        default="LET'S MAKE\nSOMETHING MATTER.",
    )
    form_name_label = models.CharField(max_length=80, default="YOUR NAME *")
    form_name_placeholder = models.CharField(max_length=120, default="Name / studio")
    form_email_label = models.CharField(max_length=80, default="EMAIL ADDRESS *")
    form_email_placeholder = models.CharField(max_length=120, default="you@company.com")
    form_message_label = models.CharField(max_length=80, default="PROJECT DESCRIPTION *")
    form_message_placeholder = models.CharField(
        max_length=200,
        default="What are we making, for whom, and when?",
    )
    form_submit_label = models.CharField(max_length=80, default="SUBMIT PROJECT")
    form_validation_message = models.CharField(
        max_length=160,
        default="CHECK THE REQUIRED FIELDS.",
    )
    form_sending_message = models.CharField(max_length=80, default="SENDING...")
    form_error_message = models.CharField(
        max_length=160,
        default="Something went wrong.",
    )
    response_required_message = models.CharField(
        max_length=180,
        default="Please complete all required fields.",
    )
    response_email_message = models.CharField(
        max_length=180,
        default="Please enter a valid email address.",
    )
    response_short_message = models.CharField(
        max_length=180,
        default="Tell me a little more about your project.",
    )
    response_success_message = models.CharField(
        max_length=180,
        default="Message received. I’ll reply within 24 hours.",
    )

    footer_tagline = models.CharField(
        max_length=180,
        default="VIDEO EDITOR & MOTION DESIGNER\nAVAILABLE WORLDWIDE",
    )
    footer_email = models.EmailField(default="hello@voxeditor.com")
    footer_link_1_label = models.CharField(max_length=80, default="YOUTUBE")
    footer_link_1_url = models.CharField(max_length=500, default="#work")
    footer_link_2_label = models.CharField(max_length=80, default="INSTAGRAM")
    footer_link_2_url = models.CharField(max_length=500, default="#work")
    copyright_text = models.CharField(max_length=100, default="VOX STUDIO")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "site content"
        verbose_name_plural = "site content"

    @classmethod
    def load(cls):
        return cls.objects.first() or cls()

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self):
        return "Website text and links"


class ContactMessage(models.Model):
    name = models.CharField(max_length=120)
    email = models.EmailField()
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.email}"
