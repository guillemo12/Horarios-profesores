package com.colegio.modelos.entities

import com.colegio.modelos.ConfiguracionTable
import org.jetbrains.exposed.dao.IntEntity
import org.jetbrains.exposed.dao.IntEntityClass
import org.jetbrains.exposed.dao.id.EntityID

class ConfiguracionEntity(id: EntityID<Int>) : IntEntity(id) {
    companion object : IntEntityClass<ConfiguracionEntity>(ConfiguracionTable)

    var tiempoMinimo by ConfiguracionTable.tiempoMinimo
    var tiempoMaximo by ConfiguracionTable.tiempoMaximo
    var priorizarTutor by ConfiguracionTable.priorizarTutor

}