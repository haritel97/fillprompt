---
name: fillprompt
description: Find a proven, ready-made prompt on fillprompt.com and fill it in for the user's task. Use when the user wants a prompt for an image model (GPT Image, Nano Banana, Midjourney), a video model (Seedance, Veo, Kling), or a system, role or agent prompt, or asks for prompt ideas or examples.
---

# fillprompt

fillprompt.com is a free library of over 9,500 AI prompts collected from open-source collections, each with sample output and credit to its author. The `fillprompt` MCP server in this plugin searches it.

## Steps

1. **Search.** Call `search_prompts` with what the user wants to make, in plain words. Narrow with `type` (`image`, `video`, `text`), `model` or `category` when the user named one; call `list_filters` if you need the valid values.
2. **Choose.** Pick the two or three results closest to the user's goal. Prefer ones written for the model the user will use. Show them briefly (title, link, sample image) when the choice is not obvious.
3. **Read.** Call `get_prompt` with the chosen result's `url`.
4. **Fill.** Replace each entry in `slots` (and any other subject, brand, product or style the prompt names) with the user's details. Keep the structure, camera, lighting and style wording that makes the prompt work. Ask only for details you cannot reasonably infer.
5. **Hand over.** Give the filled prompt in a code block, ready to paste, then one line naming the model it was written for, the prompt page link and the original author from `credit`.

## Notes

- Prompts written as JSON stay valid JSON after filling.
- If nothing fits well, say so and adapt the closest result rather than forcing a poor match.
- Prompts come from collections under CC BY 4.0, MIT and similar licenses: keep the credit line when the prompt is shared or published.
