"""
Starter Form & Widget Templates for rapid onboarding.
Pre-configures titles, rating scales, themes, and outcome screens.
"""

from typing import Any

FORM_TEMPLATES: dict[str, dict[str, Any]] = {
    "saas": {
        "name": "SaaS Feedback & Bug Catcher",
        "title": "How is your experience with our product?",
        "subtitle": "We read every single comment to improve daily.",
        "rating_scale_type": "5_star",
        "rating_required": True,
        "open_feedback_prompt": "What could we improve?",
        "open_feedback_placeholder": "Describe any bug, missing feature, or friction you encountered...",
        "contact_field_mode": "optional",
        "theme_config": {
            "primary_color": "#4249C9",
            "border_radius": 12,
            "color_scheme": "system",
        },
        "outcome_screen": {
            "low_score_title": "Thank you for the candid feedback",
            "low_score_message": "We're sorry your experience wasn't ideal. Our team reviews all issues directly.",
            "high_score_title": "Thank you so much!",
            "high_score_message": "We are thrilled you're loving our product!",
            "high_score_cta_text": "Leave a review",
            "high_score_cta_url": "",
        },
        "widget_settings": {
            "position": "bottom_right",
            "button_text": "Feedback",
            "delay_seconds": 0,
        },
        "category_pills": [
            {"id": "pill_bug", "label": "Bug Report"},
            {"id": "pill_feature", "label": "Feature Idea"},
            {"id": "pill_ux", "label": "UI & Usability"},
            {"id": "pill_billing", "label": "Pricing & Billing"},
        ],
        "custom_questions": [],
    },
    "ecommerce": {
        "name": "E-Commerce Post-Purchase Check",
        "title": "How was your shopping experience?",
        "subtitle": "Your feedback helps us deliver exceptional service.",
        "rating_scale_type": "5_star",
        "rating_required": True,
        "open_feedback_prompt": "Tell us how we did:",
        "open_feedback_placeholder": "Packaging, delivery speed, product quality, or checkout...",
        "contact_field_mode": "optional",
        "theme_config": {
            "primary_color": "#059669",
            "border_radius": 12,
            "color_scheme": "system",
        },
        "outcome_screen": {
            "low_score_title": "We're so sorry",
            "low_score_message": "Our customer care team will look into your order immediately.",
            "high_score_title": "Thank you for shopping with us!",
            "high_score_message": "We appreciate your support. Enjoy your purchase!",
            "high_score_cta_text": "Claim 10% off next order",
            "high_score_cta_url": "",
        },
        "widget_settings": {
            "position": "bottom_right",
            "button_text": "Rate Us",
            "delay_seconds": 3,
        },
        "category_pills": [
            {"id": "pill_product", "label": "Product Quality"},
            {"id": "pill_shipping", "label": "Shipping & Delivery"},
            {"id": "pill_checkout", "label": "Checkout & Payment"},
            {"id": "pill_service", "label": "Customer Support"},
        ],
        "custom_questions": [],
    },
    "subscription": {
        "name": "Cancellation / Exit Survey",
        "title": "We are sorry to see you leave",
        "subtitle": "Could you tell us why you are discontinuing?",
        "rating_scale_type": "5_emoji",
        "rating_required": False,
        "open_feedback_prompt": "What could we have done better?",
        "open_feedback_placeholder": "Tell us what didn't work for you or what you needed...",
        "contact_field_mode": "hidden",
        "theme_config": {
            "primary_color": "#6366F1",
            "border_radius": 12,
            "color_scheme": "system",
        },
        "outcome_screen": {
            "low_score_title": "Thank you for your honesty",
            "low_score_message": "Your input helps us build a better platform. You're always welcome back.",
            "high_score_title": "Thank you for being with us",
            "high_score_message": "We wish you all the best and hope to see you again soon.",
            "high_score_cta_text": "",
            "high_score_cta_url": "",
        },
        "widget_settings": {
            "position": "bottom_right",
            "button_text": "Exit Survey",
            "delay_seconds": 0,
        },
        "category_pills": [
            {"id": "pill_cost", "label": "Too Expensive"},
            {"id": "pill_missing", "label": "Missing Features"},
            {"id": "pill_alternative", "label": "Switched to Competitor"},
            {"id": "pill_not_used", "label": "Not Using Enough"},
        ],
        "custom_questions": [],
    },
    "service": {
        "name": "Client Project Satisfaction",
        "title": "How did we do on your project?",
        "subtitle": "We value your honest opinion to improve our service delivery.",
        "rating_scale_type": "1_10_numeric",
        "rating_required": True,
        "open_feedback_prompt": "Any comments or suggestions for the team?",
        "open_feedback_placeholder": "Communication, timelines, deliverable quality, support...",
        "contact_field_mode": "optional",
        "theme_config": {
            "primary_color": "#2563EB",
            "border_radius": 10,
            "color_scheme": "system",
        },
        "outcome_screen": {
            "low_score_title": "Thank you for your feedback",
            "low_score_message": "Our partners have been notified and will follow up personally.",
            "high_score_title": "Thank you for working with us!",
            "high_score_message": "It was our pleasure partnering with you on this project.",
            "high_score_cta_text": "Leave a Google Review",
            "high_score_cta_url": "",
        },
        "widget_settings": {
            "position": "bottom_right",
            "button_text": "Rate Us",
            "delay_seconds": 0,
        },
        "category_pills": [
            {"id": "pill_delivery", "label": "Project Delivery"},
            {"id": "pill_communication", "label": "Communication"},
            {"id": "pill_quality", "label": "Quality of Work"},
            {"id": "pill_timelines", "label": "Timelines"},
        ],
        "custom_questions": [],
    },
    "general": {
        "name": "General Feedback Form",
        "title": "How was your experience today?",
        "subtitle": "We read every single comment to improve.",
        "rating_scale_type": "5_star",
        "rating_required": True,
        "open_feedback_prompt": "What could we improve?",
        "open_feedback_placeholder": "Tell us what you liked or what went wrong...",
        "contact_field_mode": "optional",
        "theme_config": {
            "primary_color": "#4249C9",
            "border_radius": 12,
            "color_scheme": "system",
        },
        "outcome_screen": {
            "low_score_title": "Thank you for the feedback",
            "low_score_message": "We appreciate your candor and will work to make it right.",
            "high_score_title": "Thank you!",
            "high_score_message": "We're glad to have you with us!",
            "high_score_cta_text": "",
            "high_score_cta_url": "",
        },
        "widget_settings": {
            "position": "bottom_right",
            "button_text": "Feedback",
            "delay_seconds": 0,
        },
        "category_pills": [
            {"id": "pill_general", "label": "General Feedback"},
            {"id": "pill_idea", "label": "Ideas & Suggestions"},
            {"id": "pill_problem", "label": "Problems & Errors"},
        ],
        "custom_questions": [],
    },
}


def get_form_template(template_type: str | None) -> dict[str, Any]:
    """
    Retrieve default values for a given template type.
    Falls back to 'general' if template type is unrecognized or None.
    """
    key = (template_type or "general").lower()
    return FORM_TEMPLATES.get(key, FORM_TEMPLATES["general"]).copy()

