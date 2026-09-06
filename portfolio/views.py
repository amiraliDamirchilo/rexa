from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_POST

from .models import ContactMessage, SiteContent, WorkProject


def index(request):
    projects = WorkProject.objects.all()
    content = SiteContent.load()
    return render(
        request,
        "portfolio/index.html",
        {"content": content, "projects": projects},
    )


@require_POST
def contact(request):
    content = SiteContent.load()
    fields = {
        "name": request.POST.get("name", "").strip(),
        "email": request.POST.get("email", "").strip(),
        "message": request.POST.get("message", "").strip(),
    }

    if not all(fields.values()):
        return JsonResponse(
            {"ok": False, "message": content.response_required_message},
            status=400,
        )

    try:
        validate_email(fields["email"])
    except ValidationError:
        return JsonResponse(
            {"ok": False, "message": content.response_email_message},
            status=400,
        )

    if len(fields["message"]) < 12:
        return JsonResponse(
            {"ok": False, "message": content.response_short_message},
            status=400,
        )

    ContactMessage.objects.create(**fields)
    return JsonResponse({"ok": True, "message": content.response_success_message})
