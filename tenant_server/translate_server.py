# translate_service.py
import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline
import uvicorn
from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer, pipeline

load_dotenv()

app = FastAPI(title="HF Translate Service")




# Cache pipelines so we only load each model once
pipelines: dict[tuple[str,str], pipeline] = {}


class TranslateRequest(BaseModel):
    text: str
    from_lang: str  # e.g. "en"
    to: str         # e.g. "es"

class TranslateResponse(BaseModel):
    translated: str
    model:      str
    from_lang:  str
    to:         str
MODEL_NAME = "facebook/m2m100_418M"  # or m2m100_1.2B if you can
tokenizer = M2M100Tokenizer.from_pretrained(MODEL_NAME)
model     = M2M100ForConditionalGeneration.from_pretrained(MODEL_NAME)

translator = pipeline(
    task="translation",
    model=model,
    tokenizer=tokenizer,
    device=-1,           # CPU; use 0 for GPU
)

@app.post("/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    try:
        tokenizer.src_lang = req.from_lang
        lines = req.text.split("\n")
        out_lines = []

        for line in lines:
            # preserve blank lines
            if not line.strip():
                out_lines.append("")
                continue

            # translate just this one line
            # perform translation
            outputs = translator(
                req.text,
                max_length=512,
                src_lang=req.from_lang,
                tgt_lang=req.to,
            )
            output = outputs[0]["translation_text"]
            out_lines.append(output)

        translated = "\n".join(out_lines)
        return TranslateResponse(
            translated=translated,
            model=MODEL_NAME,
            from_lang=req.from_lang,
            to=req.to
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Optional: set PORT via env, default 5001
    port = int(os.environ.get("T_PORT", 5001))
    uvicorn.run("translate_server:app", host="0.0.0.0", port=port, reload=False)
