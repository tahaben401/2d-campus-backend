import { supabase } from "../utils/supabase.js";
export const getLogements = async (req, res,next) =>{
    try{
        const{count:Occupée,error:errorOcupée} = await supabase
        .from('chambres')
        .select('*',{ count: 'exact' , head: true })
        .eq('etat','Occupée');
        if (errorOcupée) {
            return next(createError(500, `Erreur comptage occupées: ${errorOcupée.message}`));
        }
        const{count:Disponible,error:errorDisponible} = await supabase
        .from('chambres')
        .select('*',{ count: 'exact' , head: true })
        .eq('etat','Disponible');
        if (errorDisponible) {
            return next(createError(500, `Erreur comptage disponibles: ${errorDisponible.message}`));
        }
        return res.status(200).json({
            status: 200,
            data: {
                Occupée: Occupée,
                Disponible: Disponible
            },
            message: "Logements counts retrieved successfully"
        });
    }catch(error){
        return next(createError(500, `Erreur serveur: ${error.message}`));
        }
    }

export const getDetailsCompletsChambres = async (req, res, next) =>{
    try{
        const {data:chambres,error:errorchambres} = await supabase
        .from('chambres')
        .select('*');
        if (errorchambres) {
            return next(createError(500, `Erreur récupération chambres: ${errorchambres.message}`));
        }

        const {data:etudiants,error:erroretudiants} = await supabase
        .from('etudiants_logement')
        .select('*');
        if(erroretudiants){
            return next(createError(500, `Erreur récupération étudiants: ${erroretudiants.message}`));
        }
        const resultat = chambres.map(chambre => {
           
            const occupant = etudiants.find(e => e.numero_chambre == chambre.numero_chambre);

            return {
                numero_chambre: chambre.numero_chambre,
                etat: chambre.etat,
                surface: chambre.surface_m2,
                
                etudiant_nom: occupant ? `${occupant.nom} ${occupant.prenom}` : "Aucun",
                type_chambre: occupant ? occupant.type_chambre : "Inconnu (Donnée manquante)",
                etage: occupant ? occupant.etage : "Inconnu",
                batiment: occupant ? occupant.batiment : "Inconnu"
            };
        });
        res.json({
            status: 200,
            data: resultat,
            message: "Détails complets des chambres récupérés avec succès"
        });

    }catch(error){
        return next(createError(500, `Erreur serveur: ${error.message}`));
    }
    
}