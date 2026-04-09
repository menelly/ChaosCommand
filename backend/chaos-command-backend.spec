# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files

datas = []
datas += collect_data_files('en_core_web_sm')
datas += collect_data_files('spacy')


a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=['spacy', 'en_core_web_sm', 'reportlab', 'pdfplumber', 'PIL', 'cv2', 'pytesseract', 'dateutil'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'torchaudio',       # not used - audio processing
        'torchvision',      # not used - vision model inference
        'functorch',        # not used - research tool
        'torch.cuda',       # NER runs on CPU, no GPU needed
        'torch.xpu',        # Intel GPU - not used
    ],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='chaos-command-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
