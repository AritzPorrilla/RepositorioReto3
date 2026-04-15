Peli=require('./peliculaModel');
exports.index = async function(req,res)
{
    try{
        const peliculas = await Peli.get();
        console.log(peliculas);
        res.json({
            status: 'success',
            message: 'Games retrived succesfully',
            data: peliculas
        });
    }catch(err)
    {
        res.json({
            status: 'error',
            message: err.message
        })
    }
}

exports.new = async function(req, res)
{
    try{
        const pelicula = new Peli({
            titulo: req.body.titulo,
            descripcion: req.body.descripcion ,
            valoraciones: req.body.valoraciones,
            generos: req.body.generos,
            numero_reproducciones: req.body.numero_reproducciones,
            premios: req.body.premios,
            duracion: req.body.duracion,
            director: req.body.director,

        });
        
    const savedPelicula = await pelicula.save();    
    
    res.json({
        message: 'Pelicula Añadida',
        data: savedPelicula
    });
    }catch(err)
    {
        res.status(500).json(
        {
            message: 'Error al crear el juego',
            error: err.message
        })
    }
}


exports.view = async function (req, res) 
{
    try
    {
        const pelicula = await Peli.findById(req.params.pelicula_id);
        if(!pelicula)
        {
            return res.status(404).json({
                status:"error",
                message: "Game not found"
            })
        }

        res.json({
            message:"Game details",
            data: pelicula
        })
    }   
    catch(error)
    {
        res.status(500).json({
            status: "error",
            message: "Error fetching game details",
        });
    } 
}

exports.update = async function (req, res) 
{
        try
        {
            const pelicula = await Peli.findById(req.params.pelicula_id);
            if(!pelicula)
            {
                return res.status(404).json({
                    status:"error",
                    message: "Game not found"
                })
            }


            pelicula.titulo = req.body.titulo || pelicula.titulo;
            pelicula.descripcion = req.body.descripcion || pelicula.descripcion;
            pelicula.valoraciones = req.body.valoraciones || pelicula.valoraciones;
            pelicula.generos = req.body.generos || pelicula.generos;
            pelicula.numero_reproducciones = req.body.numero_reproducciones || pelicula.numero_reproducciones;
            pelicula.premios = req.body.premios || pelicula.premios;
            pelicula.duracion = req.body.duracion || pelicula.duracion;
            pelicula.director = req.body.director || pelicula.director;
            
            
            
            const updatedPelicula = await pelicula.save();

            res.json({
                message: "Game updated",
                data: updatedPelicula
            })
        }
        catch(err)
        {
            res.status(500).json({
                message: "Error updating game",
                error: err.message
            })
        }

}


exports.delete = async function (req, res)
{
    try
        {
            const pelicula = await Peli.findByIdAndDelete(req.params.pelicula_id);
            if(!pelicula)
            {
                return res.status(404).json({
                    status: "error",
                    message: "Game not found"
                })
            }
            res.json({
                status: "Success",
                message: "Pelicula Deleteada"
                
            })
        }
        catch(err)
        {
            res.status(500).json({
                message: "Error updating game",
                error: err.message
            })
        }
}


exports.viewgenero = async function (req, res) 
{
    try
    {
        const pelicula = await Peli.find({generos: req.params.genero});
        if(!pelicula)
        {
            return res.status(404).json({
                status:"error",
                message: "Game not found"
            })
        }

        res.json({
            message:"Detalles de la pelicula",
            data: pelicula
        })
    }   
    catch(error)
    {
        res.status(500).json({
            status: "error",
            message: "Error fetching game details",
        });
    } 
}

