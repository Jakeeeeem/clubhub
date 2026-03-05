const formBuilder = require("./form-builder.js");

// Mock DOM dependencies if any are needed inside functions (like document.getElementById, which we won't fully invoke in pure logic tests)
global.document = {
  getElementById: jest.fn(() => ({
    value: "",
    innerHTML: "",
    style: {},
    toggle: jest.fn(),
    classList: { toggle: jest.fn(), add: jest.fn(), remove: jest.fn() },
  })),
  querySelectorAll: jest.fn(() => []),
};

describe("Form Builder Logic", () => {
  beforeEach(() => {
    formBuilder.setFields([]);
    formBuilder.setSelectedFieldIdx(-1);
  });

  test("should add different field types correctly", () => {
    formBuilder.addField("text");
    formBuilder.addField("select");

    const fields = formBuilder.getFields();
    expect(fields.length).toBe(2);

    expect(fields[0].type).toBe("text");
    expect(fields[0].options).toEqual([]);

    expect(fields[1].type).toBe("select");
    expect(fields[1].options.length).toBeGreaterThan(0); // Select fields should spawn with default Option 1

    expect(formBuilder.getSelectedFieldIdx()).toBe(1); // Latest field should be selected
  });

  test("should delete field and update selection correctly", () => {
    formBuilder.addField("text");
    formBuilder.addField("number");
    formBuilder.addField("email");

    expect(formBuilder.getFields().length).toBe(3);

    // Delete the middle field
    formBuilder.deleteField(1);

    const fields = formBuilder.getFields();
    expect(fields.length).toBe(2);
    expect(fields[0].type).toBe("text");
    expect(fields[1].type).toBe("email"); // number was deleted

    // Ensure selected index capped
    expect(formBuilder.getSelectedFieldIdx()).toBeLessThan(2);
  });

  test("should update field properties correctly", () => {
    formBuilder.addField("text");

    formBuilder.updateField(0, "label", "Full Name");
    formBuilder.updateField(0, "required", true);

    const fields = formBuilder.getFields();
    expect(fields[0].label).toBe("Full Name");
    expect(fields[0].required).toBe(true);
  });

  test("should handle adding, removing, and updating options for select fields", () => {
    formBuilder.addField("select"); // automatically adds 'Option 1'

    formBuilder.addOption(0); // adds 'Option 2'
    const fields = formBuilder.getFields();
    expect(fields[0].options).toEqual(["Option 1", "Option 2"]);

    formBuilder.updateOption(0, 1, "Custom Option");
    expect(fields[0].options).toEqual(["Option 1", "Custom Option"]);

    formBuilder.removeOption(0, 0);
    expect(fields[0].options).toEqual(["Custom Option"]);
  });

  test("should handle row drop (reordering fields via drag-and-drop)", () => {
    formBuilder.addField("text"); // index 0
    formBuilder.addField("number"); // index 1
    formBuilder.addField("date"); // index 2

    // Simulating the user dragging row 0 (text) and dropping it over row 2 (date)
    formBuilder.setDragRowSrc(0);

    // Mock event object
    const mockEvent = { stopPropagation: jest.fn() };

    formBuilder.onRowDrop(mockEvent, 2);

    const fields = formBuilder.getFields();

    // Order should be: number (was 1), date (was 2), text (was 0 moved to 2)
    expect(fields[0].type).toBe("number");
    expect(fields[1].type).toBe("date");
    expect(fields[2].type).toBe("text");

    // Ensure new selection tracks the moved item
    expect(formBuilder.getSelectedFieldIdx()).toBe(2);
  });
});
