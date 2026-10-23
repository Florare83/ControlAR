# Marca qué juegos forman parte de la ludoteca (campo se_presta). Seguro de repetir.
#   python -m app.core.marcar_se_presta "Catan" "Carcassonne"   -> solo esos títulos
#   python -m app.core.marcar_se_presta --todos                  -> todos los juegos
#   python -m app.core.marcar_se_presta --ninguno "Catan"        -> los destilda
#   python -m app.core.marcar_se_presta --listar                 -> muestra el estado actual
# Los títulos se comparan sin importar mayúsculas. No borra nada.
import sys

from sqlalchemy import func

from app.core.db import SessionLocal
from app.models.juego import Juego


def main(argumentos: list[str]) -> None:
    db = SessionLocal()
    try:
        if "--listar" in argumentos:
            for juego in db.query(Juego).order_by(Juego.titulo).all():
                print(f"{'[x]' if juego.se_presta else '[ ]'} {juego.id:>4}  {juego.titulo}")
            return

        valor = "--ninguno" not in argumentos
        titulos = [a for a in argumentos if not a.startswith("--")]

        if "--todos" in argumentos:
            consulta = db.query(Juego)
        elif titulos:
            consulta = db.query(Juego).filter(
                func.lower(Juego.titulo).in_([t.strip().lower() for t in titulos])
            )
        else:
            print(__doc__)
            return

        juegos = consulta.all()
        for juego in juegos:
            juego.se_presta = valor
        db.commit()

        encontrados = {j.titulo.lower() for j in juegos}
        for titulo in titulos:
            if titulo.strip().lower() not in encontrados:
                print(f"No se encontró un juego llamado «{titulo}».")
        print(f"{len(juegos)} juego(s) {'marcados' if valor else 'desmarcados'} como disponibles para préstamo.")
    finally:
        db.close()


if __name__ == "__main__":
    main(sys.argv[1:])
