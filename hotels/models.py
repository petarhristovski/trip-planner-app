from django.db import models
from datetime import timedelta
from django.utils import timezone

# Create your models here.

class HotelSearch(models.Model):
    city = models.CharField(max_length=200)
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    adults = models.IntegerField(default=1)
    results = models.JSONField()  # Store the hotel properties JSON
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_stale(self, hours=24):
        return timezone.now() - self.updated_at > timedelta(hours=hours)
