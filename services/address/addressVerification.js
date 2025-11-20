export async function verify(req, res) {
    const { query } = req.query;

    if (!query || query.trim().length < 3) {
        return res.status(400).json({
        status: "error",
        message: "Query too short",
        });
    }

    try {
        const token = process.env.MAPBOX_TOKEN;

        // Correct endpoint for Mapbox Search v1 Forward API
        const url =
            `https://api.mapbox.com/search/searchbox/v1/forward` +
            `?q=${encodeURIComponent(query)}` +
            `&limit=5` +
            `&access_token=${token}`;

        const response = await fetch(url);

        if (!response.ok) {
            return res.status(500).json({
                status: "error",
                message: "Mapbox request failed",
            });
        }

        const json = await response.json();

        const features = json.features || [];
        
        const results = features
            .map((f) => ({
                label: f.properties?.full_address,
                lon: f.geometry?.coordinates?.[0],
                lat: f.geometry?.coordinates?.[1],
            }))
            .filter(
                (r) =>
                typeof r.label === "string" &&
                r.label.trim().length > 0 &&
                typeof r.lon === "number" &&
                typeof r.lat === "number"
            );

        console.log(results);

        return res.json(results);

    } catch (err) {
        console.error("Mapbox verify error:", err);
        return res.status(500).json({
        status: "error",
        message: "Address verification failed",
        });
    }
}