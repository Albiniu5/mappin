---
trigger: always_on
---

Prompt for AI:
Objective:

Create an interactive web app that displays global conflicts on a world map using real-time and historical RSS feed data. The app should allow users to explore where conflicts are happening on any given day and navigate backward in time to see previous conflict reports. Focus on utility, usability, and design. It needs to be animated properly and not look like a site from 2020.

Requirements & Functionality:

Data Handling:
Ingest multiple RSS feeds that report on conflicts, protests, wars, or similar events worldwide.
Extract key data from each article: title, summary, publication date/time, location (city/country), and source.
Automatically geocode locations to latitude and longitude for map pin placement.
Store historical data to allow time-based browsing (e.g., daily, weekly, monthly views).

Map Interaction:
Interactive world map that can zoom, pan, and click on markers.
Each conflict is represented by a pin or marker; markers can vary in size, color, or icon based on severity, number of reports, or type of conflict.
Clicking a pin opens a popup with article details: title, summary, source, and a link to the original article.
Users can filter conflicts by region, type, or date.

Time Navigation:
Timeline slider or calendar interface to select a specific day or range of days.
Smooth transition of pins when moving through dates.
Ability to see an animation or playback of conflicts over a period of time.

User Interface & Design:
Clean, minimal design emphasizing map readability.
Color-coded markers or icons for different conflict types (e.g., protest, armed conflict, political unrest).
Responsive design to work on desktops, tablets, and mobile devices.
Optional dark mode for night browsing.

Utility & Additional Features:
Search bar to find conflicts by country, city, or keyword.
Option to subscribe to notifications for conflicts in specific regions or categories.
Export or share functionality: snapshot of the map, or link to a particular date/view.
Optional clustering of pins when zoomed out to reduce visual clutter.
Analytics panel: counts of conflicts per region, trends over time, and most-reported conflict types.

Performance & Scalability:
Efficient handling of large volumes of RSS feed data.
Smooth map rendering with large numbers of pins.
Ability to scale to include global data sources.

AI Integration:
Optional automatic classification of conflict types from article content.
Optional sentiment analysis to indicate intensity or severity of conflicts.
Summarization of multiple reports for the same event to avoid duplicates.

Deliverables:
Detailed app structure: pages, components, and data flow.
Description of backend logic for data ingestion, storage, and processing.
UI/UX mockups and user interaction flows.
Optional suggestions for visual enhancements (animations, heatmaps, clustering).

Goal:
Enable users to visually explore global conflicts, track patterns over time, and quickly access summarized news articles about each event—all in a clear, interactive, and engaging interface.
