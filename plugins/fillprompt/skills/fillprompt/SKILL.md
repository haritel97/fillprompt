---
name: fillprompt
description: Find a proven, ready-made prompt on fillprompt.com and fill it in for the user's task. Use when the user wants a prompt for an image model (GPT Image, Nano Banana, Midjourney), a video model (Seedance, Veo, Kling), or a system, role or agent prompt, or asks for prompt ideas or examples.
---

# fillprompt

fillprompt.com is a free library of over 12,900 AI prompts collected from open-source collections, each with sample output (where available) and credit to its author. The `fillprompt` MCP server in this plugin searches it. Browse packs at https://fillprompt.com/packs and collections at https://fillprompt.com/sources.

## Steps

1. **Orient (optional).** Call `list_filters` when you need valid `model`, `category`, `source` keys, or pack URLs.
2. **Search.** Call `search_prompts` with what the user wants to make, in plain words. Narrow with `type` (`image`, `video`, `text`), `model`, `category`, or `source` (e.g. `hodios`, `samux`, `superdesign`) when the user named one. Use `random_prompt` only when they want a surprise idea with no query.
3. **Choose.** Pick the two or three results closest to the user's goal. Prefer ones written for the model the user will use. Show them briefly (title, link, `collection` / `source`, sample image) when the choice is not obvious.
4. **Read.** Call `get_prompt` with the chosen result's `url`.
5. **Fill.** Replace each entry in `slots` (and any other subject, brand, product or style the prompt names) with the user's details. Keep the structure, camera, lighting and style wording that makes the prompt work. Ask only for details you cannot reasonably infer.
6. **Hand over.** Give the filled prompt in a code block, ready to paste, then one line naming the model it was written for, the prompt page link and the original author/collection from `credit` (include `collectionUrl` when present).

## Notes

- Prompts written as JSON stay valid JSON after filling.
- If nothing fits well, say so and adapt the closest result rather than forcing a poor match.
- Prompts come from collections under CC BY 4.0, MIT, CC0 and similar licenses: keep the credit line when the prompt is shared or published.
- Everyday synonyms work in search (e.g. "thumb" finds YouTube thumbnails). Prefer `source` when the user asks for a specific collection.
