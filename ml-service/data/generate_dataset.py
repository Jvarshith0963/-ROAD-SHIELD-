"""
Generate a realistic synthetic speed violation dataset.
Based on features similar to UK Road Safety / Kaggle traffic datasets.
Run once to produce training data: python generate_dataset.py
"""
import numpy as np
import pandas as pd
from pathlib import Path

np.random.seed(42)
N = 50_000

# Zone type encoding
zone_map = {"school": 0, "hospital": 1, "residential": 2, "highway": 3, "urban": 4}
weather_map = {"clear": 0, "rain": 1, "fog": 2, "snow": 3, "storm": 4}

zone_types   = np.random.choice(list(zone_map.keys()), N, p=[0.12, 0.08, 0.30, 0.25, 0.25])
weather_cond = np.random.choice(list(weather_map.keys()), N, p=[0.50, 0.25, 0.10, 0.08, 0.07])

speed_limits = {
    "school": 20, "hospital": 25, "residential": 30,
    "highway": 70, "urban": 40,
}
base_limits = np.array([speed_limits[z] for z in zone_types])

# Time of day (0-23 hour)
hour = np.random.randint(0, 24, N)
is_rush = ((hour >= 7) & (hour <= 9)) | ((hour >= 17) & (hour <= 19))
is_night = (hour >= 22) | (hour <= 5)

# Road conditions score (0-1, 1=worst)
road_condition = np.clip(
    np.random.beta(2, 5, N) +
    (weather_cond == "rain") * 0.15 +
    (weather_cond == "fog") * 0.20 +
    (weather_cond == "snow") * 0.30 +
    (weather_cond == "storm") * 0.35,
    0, 1
)

# Visibility (metres, 50–5000)
visibility = np.clip(
    np.random.normal(3000, 800, N) -
    (weather_cond == "fog") * 2200 -
    (weather_cond == "rain") * 500 -
    (weather_cond == "snow") * 800 -
    (weather_cond == "storm") * 1500,
    50, 5000
)

# Actual vehicle speed (influenced by all factors)
noise = np.random.normal(0, 5, N)
speed_multiplier = (
    1.0
    + is_night * 0.12
    - is_rush * 0.05
    - road_condition * 0.10
    + (zone_types == "highway") * 0.08
    - (zone_types == "school") * 0.05
)
actual_speed = np.clip(base_limits * speed_multiplier + noise, 5, 130)

# Violation: actual > limit + tolerance (5 km/h)
violation = (actual_speed > (base_limits + 5)).astype(int)

# Traffic density (vehicles/km)
traffic_density = np.clip(
    np.random.normal(50, 20, N) +
    is_rush * 40 -
    is_night * 20,
    1, 200
)

df = pd.DataFrame({
    "zone_type":       [zone_map[z] for z in zone_types],
    "weather_condition":[weather_map[w] for w in weather_cond],
    "speed_limit":     base_limits,
    "actual_speed":    np.round(actual_speed, 1),
    "hour":            hour,
    "is_rush_hour":    is_rush.astype(int),
    "is_night":        is_night.astype(int),
    "road_condition":  np.round(road_condition, 3),
    "visibility_m":    np.round(visibility, 0),
    "traffic_density": np.round(traffic_density, 1),
    "violation":       violation,
})

out = Path(__file__).parent / "speed_violations.csv"
df.to_csv(out, index=False)
print(f"Dataset saved → {out}  |  {N} rows  |  Violation rate: {violation.mean():.2%}")
