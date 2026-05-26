# compiler spec

## Purpose

The compiler converts editor blueprints into flat runtime specs.

```text
Blueprint -> validation -> phenotype stats -> sensor schema -> actuator schema -> runtime archetype
```

## Initial equations

- `mass = sum(componentMass)`
- `drag = bodySilhouetteDrag + sum(componentDrag)`
- `basalMetabolism = massCoeff * mass + sum(componentUpkeep) + brainCoeff * brainOps`
- `maxLandThrust = sum(legPower * terrainAffinity)`
- `maxWaterThrust = sum(finPower * fluidAffinity)`
- `brainInputCount = compiled sensor channel count`
- `brainOutputCount = compiled actuator/action channel count`

## Validation rules

The compiler rejects:

- missing core,
- disconnected body,
- overlapping occupied cells,
- unsupported organs,
- invalid socket placement,
- sensor or actuator schemas that cannot be represented as flat buffers.
