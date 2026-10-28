# Límite de intentos fallidos de inicio de sesión (contra adivinar contraseñas).
#
# Vive en la memoria del proceso: alcanza para una sola instancia del backend (como en
# Render gratis). Si el servidor se reinicia, los contadores arrancan de cero.
import time
from collections import defaultdict, deque
from threading import Lock


class LimiteIntentos:
    def __init__(self, maximo: int, ventana_segundos: int):
        self.maximo = maximo
        self.ventana = ventana_segundos
        self._fallos: dict[str, deque] = defaultdict(deque)
        self._lock = Lock()

    def _vigentes(self, clave: str, ahora: float) -> deque:
        fallos = self._fallos[clave]
        while fallos and ahora - fallos[0] > self.ventana:
            fallos.popleft()
        if not fallos:
            self._fallos.pop(clave, None)
        return fallos

    def segundos_de_espera(self, clave: str) -> int:
        """0 si puede intentar; si no, los segundos que faltan para el próximo intento."""
        ahora = time.monotonic()
        with self._lock:
            fallos = self._vigentes(clave, ahora)
            if len(fallos) < self.maximo:
                return 0
            return max(1, int(self.ventana - (ahora - fallos[0])) + 1)

    def registrar_fallo(self, clave: str) -> None:
        ahora = time.monotonic()
        with self._lock:
            self._vigentes(clave, ahora)
            self._fallos[clave].append(ahora)

    def olvidar(self, clave: str) -> None:
        with self._lock:
            self._fallos.pop(clave, None)

    def reiniciar(self) -> None:
        with self._lock:
            self._fallos.clear()


# 8 contraseñas incorrectas seguidas para la misma cuenta y desde la misma conexión
# bloquean los intentos durante 10 minutos.
limite_login = LimiteIntentos(maximo=8, ventana_segundos=600)
