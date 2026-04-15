Serie=require('./serieModel');
exports.index = async function(req,res)
{
    try{
        const series = await Serie.get();
        console.log(series);
        res.json({
            status: 'success',
            message: 'Series retrived succesfully',
            data: series
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
        const serie = new Serie({
            titulo: req.body.titulo,
            descripcion: req.body.descripcion ,
            valoraciones: req.body.valoraciones,
            generos: req.body.generos,
            numero_reproducciones: req.body.numero_reproducciones,
            premios: req.body.premios,
            temporadas: req.body.temporadas

        });
        
    const savedSerie = await serie.save();    
    
    res.json({
        message: 'Serie Añadida',
        data: savedSerie
    });
    }catch(err)
    {
        res.status(500).json(
        {
            message: 'Error al crear la serie',
            error: err.message
        })
    }
}


exports.view = async function (req, res) 
{
    try
    {
        const serie = await Serie.findById(req.params.serie_id);
        if(!serie)
        {
            return res.status(404).json({
                status:"error",
                message: "Game not found"
            })
        }

        res.json({
            message:"Game details",
            data: serie
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
            const serie = await Serie.findById(req.params.serie_id);
            if(!serie)
            {
                return res.status(404).json({
                    status:"error",
                    message: "Game not found"
                })
            }

            serie.titulo = req.body.titulo || serie.titulo;
            serie.descripcion = req.body.descripcion || serie.descripcion;
            serie.valoraciones = req.body.valoraciones || serie.valoraciones;
            serie.generos = req.body.generos || serie.generos;
            serie.numero_reproducciones = req.body.numero_reproducciones || serie.numero_reproducciones;
            serie.premios = req.body.premios || serie.premios;
            serie.temporadas = req.body.temporadas || serie.temporadas;
            
            
            const updatedSerie = await serie.save();

            res.json({
                message: "Game updated",
                data: updatedSerie
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
            const serie = await Serie.findByIdAndDelete(req.params.serie_id);
            if(!serie)
            {
                return res.status(404).json({
                    status: "error",
                    message: "Game not found"
                })
            }
            res.json({
                status: "Success",
                message: "Serie Deleteada"
                
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
        const serie = await Serie.find({generos: req.params.genero});
        if(!serie)
        {
            return res.status(404).json({
                status:"error",
                message: "Serie not found"
            })
        }

        res.json({
            message:"Detalles de la Serie",
            data: serie
        })
    }   
    catch(error)
    {
        res.status(500).json({
            status: "error",
            message: "Error fetching serie details",
        });
    } 
}


