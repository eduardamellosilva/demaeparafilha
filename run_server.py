import http.server
import socketserver
import webbrowser
import threading
import os
import time

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class ConfeitariaHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve os arquivos da pasta do script
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Silencia logs de requisição comuns para um terminal limpo,
        # mostrando apenas logs importantes
        pass

def abrir_navegador():
    # Aguarda 1 segundo para garantir que o servidor iniciou antes de abrir a página
    time.sleep(1.0)
    url = f"http://localhost:{PORT}"
    print(f"\n[OK] Abrindo o sistema no navegador: {url}")
    webbrowser.open(url)

if __name__ == '__main__':
    # Altera para o diretório correto
    os.chdir(DIRECTORY)
    
    print("=" * 60)
    print("           DE MÃE PARA FILHA - SISTEMA DE CONFEITARIA")
    print("=" * 60)
    print(f"Servidor local iniciando na pasta: {DIRECTORY}")
    print(f"Endereço: http://localhost:{PORT}")
    print("-" * 60)
    print("Pressione Ctrl + C no terminal para fechar o servidor.")
    print("=" * 60)

    # Executa a abertura de browser em uma thread separada para não travar o loop do servidor
    threading.Thread(target=abrir_navegador, daemon=True).start()

    # Cria e inicia o servidor
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), ConfeitariaHTTPRequestHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[INFO] Servidor finalizado com sucesso pelo usuário.")
    except Exception as e:
        print(f"\n[ERRO] Ocorreu um erro ao iniciar o servidor: {e}")
