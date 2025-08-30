def register():
    # Minimal plugin example: contributes one extra suggestion for summaries
    def suggest(ctx):
        if (ctx or {}).get("mode") == "summary":
            return [{
                "id": "summ_timeline",
                "title": "Build a study timeline",
                "desc": "Milestones & spaced repetition checkpoints."
            }]
        return []
    return {"name": "timeline_plugin", "suggest": suggest}
