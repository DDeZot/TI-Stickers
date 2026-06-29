class Equipment {
  constructor(
    name,
    inventoryNumber,
    maintenancePeriod,
    maintenanceDone,
    maintenanceNext,
    engineer
  ) {
    this.name = name;
    this.inventoryNumber = inventoryNumber;
    this.maintenancePeriod = maintenancePeriod;
    this.maintenanceDone = maintenanceDone;
    this.maintenanceNext = maintenanceNext;
    this.engineer = engineer;
  }

  toString() {
    return `Наименование оборудования: ${this.name}
Инвентарный номер: ${this.inventoryNumber}
Периодичность ТО: ${this.maintenancePeriod}
Проведено ТО: ${this.maintenanceDone}
Следующее ТО: ${this.maintenanceNext}
Инженер ОЭиРМО: ${this.engineer}`;
  }
}

export default Equipment;
