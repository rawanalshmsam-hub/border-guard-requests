from django.urls import path

from .views import MonthView, UpcomingView

urlpatterns = [
    path('month/', MonthView.as_view(), name='calendar-month'),          # 4.1 / 4.2 / 4.3 / Home 4.6
    path('upcoming/', UpcomingView.as_view(), name='calendar-upcoming'),  # 4.4 / Home 4.7
]