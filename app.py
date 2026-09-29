"""
Flask Web App — Spy Agent: Hybrid Machine Learning & Quant Intelligence Platform
Uses ONLY Groq API directly. NO CrewAI. NO Google. NO LiteLLM.
"""

import os
import sys

# Ensure UTF-8 console output for Windows compatibility (prevents charmap/Rupee symbol errors)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# ── Set Groq key first, before ANY other imports ──────────────────────────────
# Load from .env file — never hardcode keys in source code!
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
os.environ["GROQ_API_KEY"] = GROQ_API_KEY

# ── Block every possible Google/Gemini env var ────────────────────────────────
for _key in ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_APPLICATION_CREDENTIALS",
             "GOOGLE_CLOUD_PROJECT", "GOOGLE_GENAI_USE_VERTEXAI"]:
    os.environ.pop(_key, None)

# ── Standard imports ──────────────────────────────────────────────────────────
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory
from dotenv import load_dotenv
load_dotenv(override=False)   # .env won't override what we already set above

# ── App setup ─────────────────────────────────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), 'frontend', 'dist')
app = Flask(__name__, template_folder='templates', static_folder='static')

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@app.route('/')
@app.route('/dashboard')
@app.route('/terminal')
@app.route('/galaxy')
@app.route('/stock/<path:sub>')
def serve_frontend_routes(sub=''):
    if os.path.exists(os.path.join(FRONTEND_DIST, 'index.html')):
        return send_from_directory(FRONTEND_DIST, 'index.html')
    return render_template('index.html')


@app.route('/assets/<path:path>')
def serve_assets(path):
    if os.path.exists(FRONTEND_DIST):
        return send_from_directory(os.path.join(FRONTEND_DIST, 'assets'), path)
    return jsonify({'error': 'Asset not found'}), 404


@app.route('/favicon.ico')
def serve_favicon():
    if os.path.exists(FRONTEND_DIST):
        return send_from_directory(FRONTEND_DIST, 'favicon.ico')
    return ('', 204)



def normalize_ticker(raw: str, default: str = 'RELIANCE') -> str:
    if not raw:
        return default
    clean = str(raw).strip().lstrip('$').strip().upper()
    return clean if clean and clean != 'SYMBOL' else default


@app.route('/api/stock-data', methods=['GET'])
def get_stock_data_route():
    ticker = normalize_ticker(request.args.get('ticker', 'RELIANCE'))
    try:
        from stock_data import get_stock_data
        data = get_stock_data(ticker)
        return jsonify({
            'status': 'success',
            'data': data,
            'stock_data': data,
            'chart_data': data.get('chart_series', {})
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/top-stocks', methods=['GET'])
def get_top_stocks_route():
    try:
        from stock_data import get_top_5_stocks
        top_stocks = get_top_5_stocks()
        return jsonify({'status': 'success', 'stocks': top_stocks})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/market-summary', methods=['GET'])
def get_market_summary_route():
    try:
        from stock_data import get_market_summary
        data = get_market_summary()
        return jsonify(data)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/market-screener', methods=['GET'])
def get_market_screener_route():
    try:
        from stock_data import get_market_screener
        data = get_market_screener()
        return jsonify({'status': 'success', 'stocks': data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/news', methods=['GET'])
def get_news_route():
    try:
        from stock_data import get_latest_news
        data = get_latest_news()
        return jsonify({'status': 'success', 'news': data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def analyze_stock():
    payload = request.json or {}
    ticker = normalize_ticker(payload.get('ticker', 'RELIANCE'))
    language = payload.get('language', 'English').strip()
    model = payload.get('model', 'llama-3.3-70b-versatile').strip()
    custom_key = payload.get('api_key', '').strip()
    api_key = custom_key or os.environ.get("GROQ_API_KEY", "")

    if not api_key or api_key == "PASTE_YOUR_KEY_HERE":
        return jsonify({
            'status': 'error',
            'message': 'Groq API key is not set! Please enter your API key in Settings.'
        }), 400

    try:
        from ai_engine import analyze_stock as run_analysis
        result = run_analysis(ticker=ticker, language=language, api_key=api_key, model=model)
        return jsonify({
            'status': 'success',
            'ticker': result['ticker'],
            'language': result['language'],
            'master_report': result['master_report'],
            'dashboard_report': result['dashboard_report'],
            'fundamental_report': result['fundamental_report'],
            'technical_report': result['technical_report'],
            'stock_data': result['stock_data'],
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/ai-status', methods=['GET', 'POST'])
def ai_status_route():
    payload = request.json or {} if request.is_json else {}
    custom_key = payload.get('api_key', '').strip()
    api_key = custom_key or os.environ.get("GROQ_API_KEY", "")

    if not api_key:
        return jsonify({'status': 'error', 'online': False, 'message': 'No API Key configured'})

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        res = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5
        )
        return jsonify({
            'status': 'success',
            'online': True,
            'active_key_preview': f"{api_key[:6]}...{api_key[-4:]}",
            'models': [
                {'id': 'llama-3.3-70b-versatile', 'name': 'AI 1: Groq Llama 3.3 70B (Ultra-Fast Institutional)'},
                {'id': 'mixtral-8x7b-32768', 'name': 'AI 2: Groq Mixtral 8x7B (High-Speed Strategy Engine)'},
                {'id': 'deepseek-r1-distill-llama-70b', 'name': 'AI 3: DeepSeek R1 70B (Deep Reasoning)'}
            ]
        })
    except Exception as e:
        return jsonify({'status': 'error', 'online': False, 'message': str(e)})


@app.route('/api/top-value-stocks', methods=['GET'])
def get_top_value_stocks_route():
    try:
        from stock_data import get_highest_share_price_stocks
        data = get_highest_share_price_stocks()
        return jsonify({'status': 'success', 'data': data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/all-india-indices', methods=['GET'])
def get_all_india_indices_route():
    try:
        from stock_data import get_all_india_indices
        data = get_all_india_indices()
        return jsonify({'status': 'success', 'data': data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/galaxy-nodes', methods=['GET'])
def get_galaxy_nodes_route():
    try:
        from stock_data import get_multi_asset_galaxy_nodes
        data = get_multi_asset_galaxy_nodes()
        return jsonify({'status': 'success', 'data': data})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/ml-predict', methods=['GET', 'POST'])
def ml_predict_route():
    payload = request.json or {} if request.is_json else {}
    raw_sym = request.args.get('ticker') or payload.get('ticker', 'RELIANCE')
    ticker = normalize_ticker(raw_sym)
    period = request.args.get('period') or payload.get('period', '2y')
    force_retrain = bool(payload.get('force_retrain', False) or request.args.get('force', False))

    try:
        from hybrid_ml import run_hybrid_stock_prediction
        result = run_hybrid_stock_prediction(ticker=ticker, period=period, force_retrain=force_retrain)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ── AI Trading Copilot & Explainability Routes ─────────────────────────────────

@app.route('/api/copilot/explain', methods=['POST'])
def copilot_explain_route():
    payload = request.json or {}
    ticker = normalize_ticker(payload.get('ticker') or 'RELIANCE')
    section = payload.get('section', 'technicals')
    mode = payload.get('mode', 'simple')
    language = payload.get('language', 'English')
    custom_key = payload.get('api_key', '')

    try:
        from ai_copilot import get_stock_full_context, explain_section
        context = get_stock_full_context(ticker)
        result = explain_section(section=section, context=context, mode=mode, language=language, custom_key=custom_key)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'AI explanation unavailable because the required analysis data could not be retrieved: {str(e)}'}), 500


@app.route('/api/copilot/why', methods=['POST'])
def copilot_why_route():
    payload = request.json or {}
    ticker = normalize_ticker(payload.get('ticker') or 'RELIANCE')
    metric = payload.get('metric', 'rsi')
    mode = payload.get('mode', 'simple')
    language = payload.get('language', 'English')
    custom_key = payload.get('api_key', '')

    try:
        from ai_copilot import get_stock_full_context, explain_why_metric
        context = get_stock_full_context(ticker)
        result = explain_why_metric(metric=metric, context=context, mode=mode, language=language, custom_key=custom_key)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Why explanation unavailable: {str(e)}'}), 500


@app.route('/api/copilot/report', methods=['POST'])
def copilot_report_route():
    payload = request.json or {}
    ticker = normalize_ticker(payload.get('ticker') or 'RELIANCE')
    mode = payload.get('mode', 'simple')
    language = payload.get('language', 'English')
    custom_key = payload.get('api_key', '')

    try:
        from ai_copilot import get_stock_full_context, generate_full_ai_report
        context = get_stock_full_context(ticker)
        result = generate_full_ai_report(context=context, mode=mode, language=language, custom_key=custom_key)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'AI report could not be generated: {str(e)}'}), 500


@app.route('/api/copilot/chat', methods=['POST'])
def copilot_chat_route():
    payload = request.json or {}
    ticker = normalize_ticker(payload.get('ticker') or 'RELIANCE')
    message = payload.get('message', 'What is the outlook for this stock?')
    history = payload.get('history', [])
    mode = payload.get('mode', 'simple')
    language = payload.get('language', 'English')
    custom_key = payload.get('api_key', '')

    try:
        from ai_copilot import get_stock_full_context, chat_with_copilot
        context = get_stock_full_context(ticker)
        result = chat_with_copilot(message=message, history=history, context=context, mode=mode, language=language, custom_key=custom_key)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Chat engine unavailable: {str(e)}'}), 500





# ── Universe & Auto-Training Endpoints ─────────────────────────────────────────

@app.route('/api/universe/search', methods=['GET'])
def universe_search_route():
    query = request.args.get('q', '').strip()
    limit = int(request.args.get('limit', 15))
    try:
        from universe.universe_manager import search_tickers
        results = search_tickers(query, limit=limit)
        return jsonify({
            'status': 'success',
            'query': query,
            'count': len(results),
            'results': results
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Universe search error: {str(e)}'}), 500


@app.route('/api/universe/stats', methods=['GET'])
def universe_stats_route():
    try:
        from universe.universe_manager import get_universe_stats
        stats = get_universe_stats()
        return jsonify({
            'status': 'success',
            'stats': stats
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Universe stats error: {str(e)}'}), 500


@app.route('/api/universe/sync', methods=['POST'])
def universe_sync_route():
    try:
        from universe.nse_bse_scraper import sync_universe
        result = sync_universe(force_refresh=True)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Universe sync failed: {str(e)}'}), 500


@app.route('/api/models/status', methods=['GET'])
def models_status_route():
    try:
        from auto_train.model_registry import get_current_model_info
        model_info = get_current_model_info()
        return jsonify({
            'status': 'success',
            'active_model': model_info
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Model status error: {str(e)}'}), 500


@app.route('/api/models/history', methods=['GET'])
def models_history_route():
    try:
        from auto_train.model_registry import get_model_history
        history = get_model_history()
        return jsonify({
            'status': 'success',
            'history': history
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Model history error: {str(e)}'}), 500


@app.route('/api/models/retrain', methods=['POST'])
def models_retrain_route():
    payload = request.json or {}
    tickers = payload.get('tickers', ["RELIANCE", "TCS", "INFY"])
    period = payload.get('period', '2y')
    force = payload.get('force', False)
    try:
        from auto_train.trainer_job import run_auto_train_job
        res = run_auto_train_job(tickers=tickers, period=period, force_promote=force)
        return jsonify(res)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Model auto-training failed: {str(e)}'}), 500


@app.route('/api/models/rollback', methods=['POST'])
def models_rollback_route():
    try:
        from auto_train.model_registry import rollback_to_previous
        res = rollback_to_previous()
        return jsonify(res)
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Model rollback failed: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"\n{'='*65}")
    print(f"  [+] Spy Agent — Institutional Quant & ML Platform")
    print(f"  [ML] Architecture: GBDT + PyTorch BiLSTM (Attention Fusion)")
    print(f"  [AI] LLM Engine  : Groq Llama 3.3 70B (Parallel Research Agents)")
    print(f"  [>] Live Web UI  : http://localhost:{port}")
    print(f"{'='*65}\n", flush=True)
    try:
        from waitress import serve
        print(f"  [*] Production WSGI Waitress Engine serving on 0.0.0.0:{port} (8 threads)", flush=True)
        serve(app, host='0.0.0.0', port=port, threads=8)
    except Exception as e:
        print(f"  [!] Fallback to standard server: {e}", flush=True)
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
