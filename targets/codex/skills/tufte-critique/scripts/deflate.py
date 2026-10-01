#!/usr/bin/env python3




















import argparse, json, sys


def deflate(values, years, cpi, base_year=None, label=None):
    if len(values) != len(years):
        raise ValueError("values and years must have the same length")
    cpi = {int(k): float(v) for k, v in cpi.items()}
    if base_year is None:
        base_year = max(years)
    base_year = int(base_year)
    if base_year not in cpi:
        raise ValueError(f"No CPI supplied for base year {base_year}. "
                         f"Supplied years: {sorted(cpi)}")
    missing = [y for y in years if y not in cpi]
    if missing:
        raise ValueError(f"No CPI supplied for year(s) {missing}. "
                         f"Retrieve them and pass via --cpi; this tool will not guess. "
                         f"Supplied years: {sorted(cpi)}")
    base_cpi = cpi[base_year]
    rows = []
    for nominal, y in zip(values, years):
        real = nominal * base_cpi / cpi[y]
        rows.append({"year": y, "nominal": nominal, "cpi": cpi[y],
                     "real": round(real, 2)})
    return {"base_year": base_year,
            "label": label or f"real {base_year} units",
            "rows": rows}


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--values", required=True, help="comma-separated nominal values")
    p.add_argument("--years", required=True, help="comma-separated years")
    p.add_argument("--cpi", required=True, help='JSON mapping year->CPI, e.g. {"2005":195.3}')
    p.add_argument("--base-year", type=int, default=None)
    p.add_argument("--label", default=None)
    a = p.parse_args()
    try:
        values = [float(v) for v in a.values.split(",")]
        years = [int(y) for y in a.years.split(",")]
        cpi = json.loads(a.cpi)
        out = deflate(values, years, cpi, a.base_year, a.label)
    except (ValueError, json.JSONDecodeError) as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Base year: {out['base_year']}   ({out['label']})")
    print(f"{'Year':>6} {'Nominal':>14} {'CPI':>9} {'Real':>16}")
    for r in out["rows"]:
        print(f"{r['year']:>6} {r['nominal']:>14,.2f} {r['cpi']:>9.1f} {r['real']:>16,.2f}")
    print(json.dumps(out))


if __name__ == "__main__":
    main()
