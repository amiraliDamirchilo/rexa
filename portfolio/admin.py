from django.contrib import admin
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import ContactMessage, SiteContent, WorkProject


admin.site.site_header = "VOX Studio Control Room"
admin.site.site_title = "VOX Admin"
admin.site.index_title = "Website management"


@admin.register(WorkProject)
class WorkProjectAdmin(admin.ModelAdmin):
    fields = ("youtube_url", "title", "description")
    list_display = ("title", "youtube_url")
    search_fields = ("title", "description", "youtube_url")
    ordering = ("created_at",)
    save_on_top = True


@admin.register(SiteContent)
class SiteContentAdmin(admin.ModelAdmin):
    save_on_top = True
    fieldsets = (
        (
            "Identity and navigation",
            {
                "description": "Browser metadata, brand name, menu labels, and the main navigation.",
                "fields": (
                    "page_title",
                    "meta_description",
                    "skip_link_label",
                    "brand_name",
                    ("menu_open_label", "menu_close_label"),
                    ("nav_work", "nav_services", "nav_about"),
                    ("nav_process", "nav_contact", "header_cta"),
                ),
            },
        ),
        (
            "Hero",
            {
                "fields": (
                    "hero_index",
                    ("hero_line_1", "hero_line_2"),
                    ("hero_line_3", "hero_line_4"),
                    "hero_intro",
                    "hero_cta",
                    "hero_image_alt",
                    ("hero_role", "hero_attention"),
                ),
            },
        ),
        (
            "Services",
            {
                "fields": (
                    "services_heading",
                    "services_highlight",
                    ("service_1_title", "service_1_description"),
                    ("service_2_title", "service_2_description"),
                    ("service_3_title", "service_3_description"),
                ),
            },
        ),
        (
            "Work section",
            {
                "description": "Project titles and descriptions are managed separately under Work projects.",
                "fields": (
                    "work_index",
                    ("work_title_1", "work_title_2"),
                    "work_intro",
                    ("work_format_label", "work_empty_message"),
                ),
            },
        ),
        (
            "Process",
            {
                "fields": (
                    "process_marquee",
                    "process_index",
                    ("process_title_1", "process_title_2"),
                    "process_intro",
                    ("process_1_title", "process_1_description"),
                    ("process_2_title", "process_2_description"),
                    ("process_3_title", "process_3_description"),
                    ("process_4_title", "process_4_description"),
                ),
            },
        ),
        (
            "About and statistics",
            {
                "fields": (
                    "about_stamp",
                    "about_index",
                    ("about_title_1", "about_title_2"),
                    "about_paragraph_1",
                    "about_paragraph_2",
                    ("stat_1_value", "stat_1_label"),
                    ("stat_2_value", "stat_2_label"),
                    ("stat_3_value", "stat_3_label"),
                ),
            },
        ),
        (
            "Contact section and form",
            {
                "fields": (
                    "contact_index",
                    ("contact_title_1", "contact_title_2"),
                    "contact_intro",
                    "availability_text",
                    ("form_eyebrow", "form_heading"),
                    ("form_name_label", "form_name_placeholder"),
                    ("form_email_label", "form_email_placeholder"),
                    ("form_message_label", "form_message_placeholder"),
                    "form_submit_label",
                    ("form_validation_message", "form_sending_message"),
                    "form_error_message",
                    "response_required_message",
                    "response_email_message",
                    "response_short_message",
                    "response_success_message",
                ),
            },
        ),
        (
            "Footer",
            {
                "fields": (
                    "footer_tagline",
                    "footer_email",
                    ("footer_link_1_label", "footer_link_1_url"),
                    ("footer_link_2_label", "footer_link_2_url"),
                    "copyright_text",
                ),
            },
        ),
    )

    def changelist_view(self, request, extra_context=None):
        content = SiteContent.objects.first()
        if content:
            return HttpResponseRedirect(
                reverse("admin:portfolio_sitecontent_change", args=(content.pk,))
            )
        return super().changelist_view(request, extra_context)

    def has_add_permission(self, request):
        return not SiteContent.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "created_at")
    search_fields = ("name", "email", "message")
    list_filter = ("created_at",)
    readonly_fields = ("name", "email", "message", "created_at")
