import { supabase } from "../utils/supabase.js"
import ApiError from "../utils/ApiError.js";


const getStats = async(req, res) => {
    try {
        // Get total count
        const { count: totalCount, error: totalError } = await supabase
            .from('etudiants_logement')
            .select('*', { count: 'exact', head: true })
        
        if (totalError) throw totalError

        
        const { data, error } = await supabase
            .from('etudiants_logement')
            .select('batiment, etage')
        
        if (error) throw error

        const grouped = data.reduce((acc, row) => {
            const batiment = row.batiment
            const etage = row.etage
            
            if (!acc[batiment]) {
                acc[batiment] = {}
            }
            if (!acc[batiment][etage]) {
                acc[batiment][etage] = 0
            }
            acc[batiment][etage]++
            
            return acc
        }, {})

        
        const stats = {
            total: totalCount,
            byBatiment: {}
        }

    
        Object.keys(grouped).forEach(batiment => {
            stats.byBatiment[batiment] = {
                total: Object.values(grouped[batiment]).reduce((sum, count) => sum + count, 0),
                byEtage: grouped[batiment]
            }
        })

        res.send(stats)

    } catch (error) {
        console.error(error)
        res.status(500).send({ error: error.message })
    }
}

export default { getStats }