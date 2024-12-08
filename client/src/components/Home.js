import React, {useState, useEffect} from "react";

export default function Home() {

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="px-4 h-full overflow-auto">
      <div className="w-full flex-wrap flex sticky top-0 z-10 bg-white rounded pb-4 items-center justify-center mt-10">
        <h1 className="inline-block font-extrabold text-slate-500 tracking-tight ">
          Bienvenido seleccione la opcion deseada en el menu lateral
        </h1>
      </div>
    </div>
  );
}
