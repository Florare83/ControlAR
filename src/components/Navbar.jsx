{rol === "cliente" && (
  <>
    <NavLink
      to="/mis-prestamos"
      className={clase}
      onClick={cerrarMenuCuenta}
      style={{ padding: 10 }}
    >
      🎲 Mis préstamos
    </NavLink>

    <NavLink
      to="/favoritos"
      className={clase}
      onClick={cerrarMenuCuenta}
      style={{ padding: 10 }}
    >
      ❤️ Mis favoritos
    </NavLink>
  </>
)}