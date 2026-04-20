from rest_framework import serializers
from places.models import Itinerary, Activity

class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = "__all__"

    def validate_itinerary(self, itinerary):
        request = self.context.get('request')
        if request and itinerary.user != request.user:
            raise serializers.ValidationError("Cannot add activity to someone else's itinerary.")
        return itinerary

class ItinerarySerializer(serializers.ModelSerializer):
    items = ActivitySerializer(many=True, read_only=True)
    class Meta:
        model = Itinerary
        fields = "__all__"

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")
        if start and end and start > end:
            raise serializers.ValidationError({"start": "Start date cannot be after end date."})
        return attrs