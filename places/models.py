from django.db import models

from django.contrib.auth.models import User

from django.core.exceptions import ValidationError

# Create your models here.
class Itinerary(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)
    start = models.DateField()
    end = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "city", "name"],
                name="unique_itinerary_per_user_city_name",
            )
        ]

    def clean(self):
        if self.start and self.end and self.start > self.end:
            raise ValidationError({"start": "Start date cannot be after end date."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

class Activity(models.Model):
    itinerary = models.ForeignKey(Itinerary, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=255)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    def clean(self):
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({"start_time": "Activity start must be before end."})

        if self.itinerary_id:
            if self.start_time.date() < self.itinerary.start or self.end_time.date() > self.itinerary.end:
                raise ValidationError("Activity must be within itinerary date range.")

            overlap = Activity.objects.filter(
                itinerary=self.itinerary,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
            )
            if self.pk:
                overlap = overlap.exclude(pk=self.pk)
            if overlap.exists():
                raise ValidationError("This activity overlaps with another activity in the same itinerary.")

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

class PriceAnalysis(models.Model):
    city = models.CharField(max_length=255)
    country = models.CharField(max_length=255)
    average_price = models.FloatField()
    median_price = models.FloatField()
    confidence_interval_lower = models.FloatField()
    confidence_interval_upper = models.FloatField()
    sample_count = models.IntegerField()
    currency = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)