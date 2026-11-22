"""
Group rows for Modern States: continents, then UN geoscheme subregions (brief step 3), plus the colonial empires.
Order here is display order. A wave adds its subregions here; rows name a subregion as their parent.
"""

GROUPS = [
    {'id': 'europe', 'name': 'Europe', 'color': '#5a6f8f'},
    {'id': 'northern-europe', 'name': 'Northern Europe', 'color': '#4a6a8a', 'parent': 'europe'},
    {'id': 'western-europe', 'name': 'Western Europe', 'color': '#5a6f8f', 'parent': 'europe'},
    {'id': 'southern-europe', 'name': 'Southern Europe', 'color': '#8f6a4a', 'parent': 'europe'},
    {'id': 'eastern-europe', 'name': 'Eastern Europe', 'color': '#6f5a8f', 'parent': 'europe'},
    {'id': 'colonial-empires', 'name': 'Colonial empires', 'color': '#7a6a5a'},
    {'id': 'asia', 'name': 'Asia', 'color': '#8f7a3a'},
    {'id': 'western-asia', 'name': 'Western Asia', 'color': '#8f5a3a', 'parent': 'asia'},
    {'id': 'southern-asia', 'name': 'Southern Asia', 'color': '#8f7a3a', 'parent': 'asia'},
    {'id': 'south-eastern-asia', 'name': 'South-eastern Asia', 'color': '#3a8f6a', 'parent': 'asia'},
    {'id': 'africa', 'name': 'Africa', 'color': '#8f4a3a'},
    {'id': 'northern-africa', 'name': 'Northern Africa', 'color': '#9a6a3a', 'parent': 'africa'},
    {'id': 'western-africa', 'name': 'Western Africa', 'color': '#8f4a3a', 'parent': 'africa'},
    {'id': 'americas', 'name': 'Americas', 'color': '#4a7a8f'},
    {'id': 'central-america', 'name': 'Central America', 'color': '#4a7a8f', 'parent': 'americas'},
]
